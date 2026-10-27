import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { sendEmail } from '@/lib/mailer.js';
import { jinjaTextToEmailHtml } from '@/lib/jinjaEngine.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { rows, reviewDate, reviewTime = '04:00 PM', customJinjaTemplate, cc } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No feedback rows provided.' }, { status: 400 });
    }

    const scheduledDate = reviewDate || new Date().toISOString().split('T')[0];
    const results = [];

    for (const row of rows) {
      const internId = (row['Intern ID'] || row.internId || row.InternId || row['Candidate ID'] || row.candidateId || '').toString().trim();
      const name = (row['Name'] || row.name || row['Candidate Name'] || row.candidateName || '').toString().trim();
      const taskId = (row['Task ID'] || row.taskId || row.TaskId || '').toString().trim();
      const taskNumber = parseInt(row['Task Number'] || row.taskNumber || 1, 10);
      const reviewNumber = parseInt(row['Review Number'] || row.reviewNumber || 1, 10);
      const feedback = (row['Feedback'] || row.feedback || row['Notes'] || '').toString().trim();
      const rawScore = parseFloat(row['Performance Score'] || row['Performance Percentage'] || row.performancePercentage || row.score || 100);
      const score = isNaN(rawScore) ? 100 : Math.min(100, Math.max(0, rawScore));

      if (!internId) continue;

      // Find candidate
      const candidate = await prisma.candidate.findFirst({
        where: {
          OR: [
            { internId },
            { candidateId: internId },
          ],
        },
        include: {
          tasks: {
            orderBy: { taskNumber: 'desc' },
            take: 1,
          },
        },
      });

      if (!candidate) {
        results.push({ internId, name, success: false, error: 'Candidate not found in database.' });
        continue;
      }

      const activeTask = candidate.tasks[0];
      const meetLink = activeTask?.meetLink || candidate.googleMeetUrl || 'https://meet.google.com/new';

      // Record feedback review in DB
      if (activeTask) {
        await prisma.taskReview.create({
          data: {
            taskAssignmentId: activeTask.id,
            reviewNumber,
            reviewDate: scheduledDate,
            reviewTime,
            feedback: feedback || 'Evaluation feedback recorded by mentor.',
            scoreAwarded: score,
            meetLink,
            sentAt: new Date(),
          },
        });

        await prisma.taskAssignment.update({
          where: { id: activeTask.id },
          data: {
            performanceScore: score,
            feedback,
            status: `Review ${reviewNumber} Completed`,
          },
        });
      }

      // Update candidate cumulative performance score
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          performancePercentage: score,
        },
      });

      const jinjaContent = customJinjaTemplate
        ? customJinjaTemplate
            .replace(/\{\{\s*candidateName\s*\}\}/g, candidate.fullName)
            .replace(/\{\{\s*internId\s*\}\}/g, candidate.internId || candidate.candidateId)
            .replace(/\{\{\s*role\s*\}\}/g, candidate.role)
            .replace(/\{\{\s*taskNumber\s*\}\}/g, String(taskNumber))
            .replace(/\{\{\s*taskId\s*\}\}/g, taskId || activeTask?.taskId || 'TSK-ACTIVE')
            .replace(/\{\{\s*reviewNumber\s*\}\}/g, String(reviewNumber))
            .replace(/\{\{\s*reviewDate\s*\}\}/g, scheduledDate)
            .replace(/\{\{\s*reviewTime\s*\}\}/g, reviewTime)
            .replace(/\{\{\s*feedback\s*\}\}/g, feedback)
            .replace(/\{\{\s*score\s*\}\}/g, `${score.toFixed(1)}%`)
            .replace(/\{\{\s*meetLink\s*\}\}/g, meetLink)
        : `Dear ${candidate.fullName},

Your evaluation feedback for **Milestone Review #${reviewNumber}** (Task #${taskNumber}) has been finalized.

**Evaluation & Review Summary:**
- **Intern ID:** ${candidate.internId || candidate.candidateId}
- **Assigned Role:** ${candidate.role}
- **Task ID:** ${taskId || activeTask?.taskId || 'TSK-ACTIVE'}
- **Review Session Date:** **${scheduledDate}** at **${reviewTime}**
- **Awarded Milestone Score:** **${score.toFixed(1)}%**
- **Assigned Google Meet Link:** [${meetLink}](${meetLink})

**Technical Mentorship Feedback:**
${feedback || 'Satisfactory progress demonstrated. Continue implementing code modularity and comprehensive test coverage.'}

Warm regards,
**Technical Review Board**
Shortfundly Media Technologies Pvt. Ltd.`;

      const htmlBody = jinjaTextToEmailHtml(jinjaContent);
      const subject = `Review #${reviewNumber} Evaluation & Feedback - Task #${taskNumber} | ${candidate.fullName}`;

      const dispatch = await sendEmail({
        to: candidate.email,
        cc: cc || undefined,
        subject,
        text: jinjaContent,
        html: htmlBody,
      });

      await prisma.emailLog.create({
        data: {
          candidateId: candidate.id,
          recipientEmail: candidate.email,
          recipientName: candidate.fullName,
          cc: cc || null,
          subject,
          emailType: `REVIEW_${reviewNumber}_FEEDBACK`,
          body: jinjaContent,
          meetLink,
          status: dispatch.success ? 'Sent' : 'Failed',
          error: dispatch.error || null,
        },
      });

      results.push({
        candidateId: candidate.id,
        internId: candidate.internId || candidate.candidateId,
        fullName: candidate.fullName,
        email: candidate.email,
        score,
        success: dispatch.success,
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: results.filter(r => r.success).length,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error('Error processing feedback upload:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
