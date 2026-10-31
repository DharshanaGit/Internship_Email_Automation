export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { sendEmail } from '@/lib/mailer.js';
import { jinjaTextToEmailHtml } from '@/lib/jinjaEngine.js';
import { getAppBaseUrl } from '@/lib/offerService.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      candidateIds,
      candidateId,
      customRecipientEmail,
      emailMap = {},
      customSubject,
      customBody,
      penaltyAmount = 10,
      submissionUrl,
      customNote,
    } = body;

    let targetIds = [];
    if (Array.isArray(candidateIds) && candidateIds.length > 0) {
      targetIds = candidateIds;
    } else if (candidateId) {
      targetIds = [candidateId];
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Please select candidates to send warning notices.' }, { status: 400 });
    }

    const candidates = await prisma.candidate.findMany({
      where: {
        id: { in: targetIds },
        isLeaved: false,
      },
      include: {
        tasks: {
          orderBy: { taskNumber: 'desc' },
          take: 1,
        },
      },
    });

    const baseUrl = getAppBaseUrl();
    const results = [];

    for (const candidate of candidates) {
      const activeTask = candidate.tasks[0];
      const currentScore = candidate.performancePercentage || 100.0;
      const penalty = parseFloat(penaltyAmount) || 10.0;
      const newScore = Math.max(0, currentScore - penalty);

      // Support manual customization of candidate recipient mail ID
      const targetEmail = customRecipientEmail || emailMap[candidate.id] || candidate.email;

      // Apply reduction in candidate and taskAssignment
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          performancePercentage: newScore,
        },
      });

      const graceDeadline = new Date(Date.now() + 48 * 3600 * 1000);

      if (activeTask) {
        await prisma.taskAssignment.update({
          where: { id: activeTask.id },
          data: {
            performanceScore: Math.max(0, (activeTask.performanceScore || 100.0) - penalty),
            penaltyApplied: (activeTask.penaltyApplied || 0) + penalty,
            warningSentAt: new Date(),
            warningDeadline: graceDeadline,
            submissionStatus: 'WARNING_SENT',
          },
        });
      }

      const activeToken = activeTask?.submissionToken || candidate.id;
      const portalUrl = submissionUrl || `${baseUrl}/tasks/submit?token=${activeToken}`;

      let jinjaContent = customBody;
      if (!jinjaContent) {
        jinjaContent = `Dear ${candidate.fullName},

This is an **Official Formal Warning Notice** regarding your non-submission of internship milestone deliverables by the designated deadline.

**Audit & Infraction Findings:**
- **Intern ID:** ${candidate.internId || candidate.candidateId}
- **Assigned Role:** ${candidate.role}
- **Milestone:** Task #${activeTask?.taskNumber || 1} - ${activeTask?.title || 'Current Assignment'}
- **Infraction:** Deliverables were not submitted prior to the official deadline.
- **Performance Score Reduction:** **-${penalty}%**
- **Updated Cumulative Performance Score:** **${newScore.toFixed(1)}%** (reduced from ${currentScore.toFixed(1)}%)
- **Grace Period Deadline:** **${graceDeadline.toLocaleString()}**

**Urgent Rectification Required:**
You are granted an urgent grace period to complete and submit your project demo link and GitHub repository deliverables via the link below:

**[Urgent Milestone Submission Portal](${portalUrl})**
Direct URL: ${portalUrl}

${customNote ? `**HR Direct Directive:**\n${customNote}\n` : ''}

> **Strict Notice:** Subsequent missed deadlines or failure to attend reviews will result in compounding score deductions and potential revocation of your internship certificate eligibility.

Sincerely,
**Office of Academic Evaluation & Mentorship Oversight**
Shortfundly Media Technologies Pvt. Ltd.`;
      } else {
        // Replace placeholders in custom template
        jinjaContent = jinjaContent
          .replace(/\{\{candidateName\}\}/g, candidate.fullName)
          .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
          .replace(/\{\{internId\}\}/g, candidate.internId || candidate.candidateId)
          .replace(/\{\{role\}\}/g, candidate.role)
          .replace(/\{\{penalty\}\}/g, String(penalty))
          .replace(/\{\{newScore\}\}/g, newScore.toFixed(1))
          .replace(/\{\{currentScore\}\}/g, currentScore.toFixed(1))
          .replace(/\{\{submissionUrl\}\}/g, portalUrl)
          .replace(/\{\{graceDeadline\}\}/g, graceDeadline.toLocaleString());
      }

      const htmlBody = jinjaTextToEmailHtml(jinjaContent);
      const subject = customSubject
        ? customSubject
            .replace(/\{\{candidateName\}\}/g, candidate.fullName)
            .replace(/\{\{penalty\}\}/g, String(penalty))
        : `Official Warning: Performance Deduction (-${penalty}%) Applied for Task Non-Submission - ${candidate.fullName}`;

      const dispatch = await sendEmail({
        candidateId: candidate.id,
        to: targetEmail,
        subject,
        text: jinjaContent,
        html: htmlBody,
        emailType: 'FORMAL_WARNING_DEDUCTION',
      });

      await prisma.emailLog.create({
        data: {
          candidateId: candidate.id,
          recipientEmail: targetEmail,
          recipientName: candidate.fullName,
          subject,
          emailType: 'FORMAL_WARNING_DEDUCTION',
          body: jinjaContent,
          status: dispatch.success ? 'Sent' : 'Failed',
          error: dispatch.error || null,
        },
      });

      results.push({
        candidateId: candidate.id,
        recipientEmail: targetEmail,
        newScore,
        penaltyApplied: penalty,
        success: dispatch.success,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Formal warning email dispatched to ${results.length} candidate(s) with performance deduction applied.`,
      dispatchedCount: results.length,
      results,
    });
  } catch (error) {
    console.error('Error sending warning emails:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
