export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { sendEmail } from '@/lib/mailer.js';
import { jinjaTextToEmailHtml } from '@/lib/jinjaEngine.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateIds, submissionFormUrl, submissionDeadline, customNotes } = body;

    if (!submissionFormUrl) {
      return NextResponse.json({ success: false, error: 'Google Form submission URL is required.' }, { status: 400 });
    }

    const candidates = await prisma.candidate.findMany({
      where: {
        id: { in: candidateIds?.length ? candidateIds : undefined },
        isLeaved: false,
        taskStatus: { not: 'Not Assigned' },
      },
      include: {
        tasks: {
          orderBy: { taskNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ success: false, error: 'No active assigned candidates found.' }, { status: 404 });
    }

    const results = [];
    const formattedDeadline = submissionDeadline ? new Date(submissionDeadline).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'As Scheduled';

    for (const candidate of candidates) {
      const activeTask = candidate.tasks[0];
      const taskNumber = activeTask ? activeTask.taskNumber : 1;
      const taskTitle = activeTask ? activeTask.title : 'Current Milestone';

      const jinjaContent = `Dear ${candidate.fullName},

This is an official **Deadline Reminder** regarding your active Shortfundly internship assignment: **Task #${taskNumber} - ${taskTitle}**.

**Submission Requirements:**
- **Intern ID:** ${candidate.internId || candidate.candidateId}
- **Official Submission Deadline:** **${formattedDeadline}**
- **Action Required:** Submit your completed project repository link and deployed demo link using the official Google Form below:

👉 **[Click Here to Access Official Google Form Submission Portal](${submissionFormUrl})**

${customNotes ? `**Important HR Note:**\n${customNotes}\n` : ''}
> **Policy Warning:** Failure to submit before the deadline will incur an automatic **10% performance penalty deduction** on this milestone.

Best regards,
**Talent & Engineering Mentorship Operations**
Shortfundly Media Technologies Pvt. Ltd.`;

      const htmlBody = jinjaTextToEmailHtml(jinjaContent);
      const subject = `Urgent: Task #${taskNumber} Deadline Reminder & Google Form Submission - ${candidate.fullName}`;

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
          emailType: 'TASK_DEADLINE_REMINDER',
          body: jinjaContent,
          status: dispatch.success ? 'Sent' : 'Failed',
          error: dispatch.error || null,
        },
      });

      results.push({
        candidateId: candidate.id,
        email: candidate.email,
        success: dispatch.success,
      });
    }

    return NextResponse.json({
      success: true,
      count: results.filter(r => r.success).length,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error('Error dispatching deadline reminders:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
