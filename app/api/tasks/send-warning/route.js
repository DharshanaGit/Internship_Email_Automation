export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { sendEmail } from '@/lib/mailer.js';
import { jinjaTextToEmailHtml } from '@/lib/jinjaEngine.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateIds, penaltyAmount = 10, submissionUrl, customNote } = body;

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Please select candidates to send warning notices.' }, { status: 400 });
    }

    const candidates = await prisma.candidate.findMany({
      where: {
        id: { in: candidateIds },
        isLeaved: false,
      },
      include: {
        tasks: {
          orderBy: { taskNumber: 'desc' },
          take: 1,
        },
      },
    });

    const results = [];

    for (const candidate of candidates) {
      const activeTask = candidate.tasks[0];
      const currentScore = candidate.performancePercentage || 100.0;
      const newScore = Math.max(0, currentScore - penaltyAmount);

      // Apply reduction in candidate and taskAssignment
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          performancePercentage: newScore,
        },
      });

      if (activeTask) {
        await prisma.taskAssignment.update({
          where: { id: activeTask.id },
          data: {
            performanceScore: Math.max(0, (activeTask.performanceScore || 100.0) - penaltyAmount),
            penaltyApplied: (activeTask.penaltyApplied || 0) + penaltyAmount,
            warningSentAt: new Date(),
          },
        });
      }

      const jinjaContent = `Dear ${candidate.fullName},

This is a **Formal Performance Warning Notice** regarding your non-submission of internship milestone deliverables.

**Audit Findings:**
- **Intern ID:** ${candidate.internId || candidate.candidateId}
- **Assigned Role:** ${candidate.role}
- **Infraction:** Google Form submission was not completed prior to the official deadline.
- **Performance Deduction Applied:** **-${penaltyAmount}%**
- **Updated Cumulative Performance Score:** **${newScore.toFixed(1)}%** (reduced from ${currentScore.toFixed(1)}%)

${submissionUrl ? `**Immediate Rectification Required:**\nYou are granted an urgent grace window to submit your project repository and deliverables via the submission link below:\n[Urgent Submission Portal](${submissionUrl})\n` : ''}
${customNote ? `**HR Directive:**\n${customNote}\n` : ''}

> **Strict Notice:** Subsequent missed deadlines or failure to attend scheduled reviews will result in further compounding score deductions and potential revocation of your internship certificate eligibility.

Sincerely,
**Office of Academic Evaluation & Performance Review**
Shortfundly Media Technologies Pvt. Ltd.`;

      const htmlBody = jinjaTextToEmailHtml(jinjaContent);
      const subject = `Official Warning: Performance Deduction (-${penaltyAmount}%) Applied for Task Non-Submission - ${candidate.fullName}`;

      const dispatch = await sendEmail({
        to: candidate.email,
        subject,
        text: jinjaContent,
        html: htmlBody,
      });

      await prisma.emailLog.create({
        data: {
          candidateId: candidate.id,
          recipientEmail: candidate.email,
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
        email: candidate.email,
        newScore,
        success: dispatch.success,
      });
    }

    return NextResponse.json({
      success: true,
      deductedCount: results.length,
      penaltyAmount,
      results,
    });
  } catch (error) {
    console.error('Error sending performance warnings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
