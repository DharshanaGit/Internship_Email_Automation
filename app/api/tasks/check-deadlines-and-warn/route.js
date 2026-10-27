import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { sendEmail } from '@/lib/mailer.js';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3001';

export async function POST(request) {
  try {
    const now = new Date();

    // Find all tasks that missed deadline without submission and haven't had warning dispatched yet
    const overdueTasks = await prisma.taskAssignment.findMany({
      where: {
        submissionStatus: { in: ['PENDING', 'Assigned'] },
        deadline: { lt: now },
        warningSentAt: null,
      },
      include: {
        candidate: true,
      },
    });

    let warningCount = 0;
    const dispatched = [];

    for (const task of overdueTasks) {
      const candidate = task.candidate;
      if (!candidate) continue;

      // Deduct performance percentage by 10 points (from 100% down to 90% or lower)
      const currentPerf = candidate.performancePercentage ?? 100.0;
      const newPerf = Math.max(0, currentPerf - 10.0);

      // Extend deadline by 48 hours for grace period submission
      const graceDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          performancePercentage: newPerf,
        },
      });

      await prisma.taskAssignment.update({
        where: { id: task.id },
        data: {
          warningSentAt: now,
          warningDeadline: graceDeadline,
          penaltyApplied: 10.0,
          submissionStatus: 'WARNING_SENT',
          deadline: graceDeadline, // allow submission during grace window
        },
      });

      const submissionUrl = `${APP_URL}/tasks/submit?token=${task.submissionToken || task.id}`;

      const warningHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; line-height: 1.6; border: 1px solid #fecaca; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
          <div style="background: #991b1b; padding: 22px 24px; text-align: center;">
            <h1 style="color: #fee2e2; margin: 0; font-size: 20px; letter-spacing: 1px;">FORMAL WARNING: OVERDUE MILESTONE SUBMISSION</h1>
            <p style="color: #fca5a5; margin: 4px 0 0 0; font-size: 13px;">Shortfundly Media Technologies Pvt. Ltd. &bull; Academic & Mentorship Oversight</p>
          </div>
          <div style="padding: 28px 24px;">
            <p style="font-size: 15px;">Dear <strong>${candidate.fullName}</strong> (Intern ID: <strong>${candidate.internId || candidate.candidateId}</strong>),</p>
            
            <p>Our records indicate that you have failed to upload your deliverables for the assigned milestone task within the stipulated deadline.</p>

            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 3px 0;"><strong>Task Name:</strong> ${task.taskName || task.title}</p>
              <p style="margin: 3px 0;"><strong>Original Deadline:</strong> ${new Date(task.deadline).toLocaleString()}</p>
              <p style="margin: 3px 0; color: #b91c1c;"><strong>Performance Score Impact:</strong> Reduced from ${currentPerf.toFixed(0)}% to ${newPerf.toFixed(0)}% (-10% deduction)</p>
              <p style="margin: 3px 0; color: #15803d;"><strong>Grace Period Deadline:</strong> ${graceDeadline.toLocaleString()}</p>
            </div>

            <p>To avoid further performance score deductions or escalation to internship termination, you must complete and submit your project demo link and GitHub repository URL prior to the grace deadline.</p>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${submissionUrl}" style="display: inline-block; padding: 12px 26px; background-color: #dc2626; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px;">Submit Project Deliverables Now</a>
            </div>

            <p style="font-size: 12px; color: #64748b; text-align: center;">Direct submission URL: <br><a href="${submissionUrl}" style="color: #2563eb; word-break: break-all;">${submissionUrl}</a></p>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="margin: 0; font-size: 12px; color: #64748b;">Shortfundly Media Technologies Pvt. Ltd. &bull; No. 12, Anna Salai, Chennai, Tamil Nadu, 600002, India.</p>
          </div>
        </div>
      `;

      await sendEmail({
        candidateId: candidate.id,
        to: candidate.email,
        recipientName: candidate.fullName,
        subject: `Formal Warning: Overdue Milestone Task Submission (${task.taskName || task.title}) | Shortfundly Notice`,
        html: warningHtml,
        text: `Dear ${candidate.fullName}, this is a formal warning that your milestone submission for ${task.taskName || task.title} is overdue. Your performance score has been reduced to ${newPerf.toFixed(0)}%. Please submit your deliverables immediately using your portal link: ${submissionUrl}`,
        emailType: 'WARNING_NOTICE',
      });

      warningCount++;
      dispatched.push({
        candidateId: candidate.id,
        internId: candidate.internId || candidate.candidateId,
        candidateName: candidate.fullName,
        email: candidate.email,
        reducedScore: newPerf,
        graceDeadline: graceDeadline.toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      warningsDispatched: warningCount,
      candidatesAffected: dispatched,
      message: `Warning audit completed. Sent ${warningCount} formal warning notice(s) with performance deductions applied.`,
    });
  } catch (error) {
    console.error('Error running warning check:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
