export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordTaskCompletion } from '@/lib/excelTaskUpdater';
import { sendEmail } from '@/lib/mailer';
import { triggerNextAutomatedTask } from '@/lib/taskPipelineService';
import { getAppBaseUrl } from '@/lib/offerService';

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateId, taskId, feedbackNotes = 'Task reviewed and completed successfully.' } = body;

    let targetCandidateId = candidateId;

    if (!targetCandidateId && taskId) {
      const task = await prisma.taskAssignment.findUnique({ where: { id: taskId } });
      if (task) targetCandidateId = task.candidateId;
    }

    if (!targetCandidateId) {
      return NextResponse.json(
        { success: false, error: 'candidateId or taskId is required.' },
        { status: 400 }
      );
    }

    // 1. Record completion in SQLite/Postgres and auto-update Excel file on disk
    const result = await recordTaskCompletion(targetCandidateId, feedbackNotes);

    // 2. Dispatch Task Completion Notification email
    const candidate = await prisma.candidate.findUnique({ where: { id: targetCandidateId } });
    if (candidate) {
      const emailHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #10b981;">
            <h1 style="color: #34d399; margin: 0; font-size: 24px; letter-spacing: 2px;">SPRINT MILESTONE COMPLETED</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Shortfundly Media Technologies Pvt. Ltd.</p>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
            <p>Congratulations! Your internship milestone task for <strong>${candidate.role}</strong> has been officially reviewed, approved, and marked as <strong>COMPLETED</strong>.</p>
            <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
              <h4 style="margin: 0 0 6px 0; color: #047857;">Mentor Evaluation & Feedback:</h4>
              <p style="margin: 0; color: #065f46; white-space: pre-line;">${feedbackNotes}</p>
              <div style="margin-top: 10px; font-size: 13px; color: #047857; font-weight: bold;">
                Total Milestones Completed: ${result.tasksCompleted}
              </div>
            </div>
            <p>Your record in the Shortfundly internship system has been updated. You are now eligible for your official Shortfundly Internship Completion Certificate.</p>
            <p style="margin-top: 24px;">Warm regards,<br><strong>Technical Mentorship & HR Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
          </div>
        </div>
      `;

      await sendEmail({
        candidateId: candidate.id,
        to: candidate.email,
        recipientName: candidate.fullName,
        subject: `Task Completed & Approved - ${candidate.fullName} | Shortfundly`,
        html: emailHtml,
        text: `Dear ${candidate.fullName}, your milestone task has been completed and approved. Total tasks completed: ${result.tasksCompleted}.`,
        emailType: 'TASK_COMPLETED',
      });

      // 3. Automated trigger for candidate's next scheduled task mail
      try {
        const baseUrl = getAppBaseUrl();
        await triggerNextAutomatedTask(candidate.id, result.tasksCompleted, baseUrl);
      } catch (triggerErr) {
        console.error('Error triggering next automated task:', triggerErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Task successfully marked as completed! Excel spreadsheet updated on disk.`,
      tasksCompleted: result.tasksCompleted,
      nextTask: result.nextTask,
    });
  } catch (error) {
    console.error('Task complete error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
