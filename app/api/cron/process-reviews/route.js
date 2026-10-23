import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateGoogleMeetLink } from '@/lib/googleCalendar';
import { formatToDdMmYy, addDays, getRandomIstTime } from '@/lib/dateUtils';
import { generateGemmaFeedback } from '@/lib/gemmaEngine';
import { sendEmail } from '@/lib/mailer';

export async function GET(request) {
  return handleCronProcess(request);
}

export async function POST(request) {
  return handleCronProcess(request);
}

async function handleCronProcess(request) {
  try {
    const today = new Date();
    const todayDdMmYy = formatToDdMmYy(today);

    // Fetch candidates with active task assignments
    const candidates = await prisma.candidate.findMany({
      where: {
        taskStatus: { in: ['Assigned', 'Under Review 1', 'Under Review 2'] },
      },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const scheduledReviews = [];

    for (const candidate of candidates) {
      if (!candidate.tasks || candidate.tasks.length === 0) continue;
      const task = candidate.tasks[0];

      // Pipeline check:
      // Review 1: Scheduled 2 days after explanation call
      if (task.reviewCount === 0 && candidate.reviewCycle === 0) {
        // Schedule Review 1
        const rev1DateObj = addDays(today, 2);
        const rev1Date = formatToDdMmYy(rev1DateObj);
        const rev1Time = getRandomIstTime();
        const meetLink = task.meetLink || generateGoogleMeetLink();

        const subject = `Scheduled: Internship Sprint Review 1 - ${candidate.fullName} | Shortfundly`;
        const htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #090d16, #1e293b); padding: 26px 24px; text-align: center; border-bottom: 3px solid #38bdf8;">
              <h1 style="color: #38bdf8; margin: 0; font-size: 22px; letter-spacing: 1.5px;">SHORTFUNDLY SPRINT REVIEW 1</h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Role: ${candidate.role} • Technical Evaluation 1</p>
            </div>
            <div style="padding: 28px 24px;">
              <p style="font-size: 15px;">Dear <strong>${candidate.fullName}</strong>,</p>
              <p>Following your onboarding and task briefing, your first technical review milestone has been scheduled by the automated curriculum pipeline.</p>
              
              <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 18px; margin: 20px 0; border-radius: 6px;">
                <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 15px;">Review 1 Meeting Schedule</h4>
                <p style="margin: 4px 0;"><strong>Sprint Task:</strong> ${task.title}</p>
                <p style="margin: 4px 0;"><strong>Date:</strong> ${rev1Date} (2 days after explanation call)</p>
                <p style="margin: 4px 0;"><strong>Time Slot:</strong> ${rev1Time}</p>
                <p style="margin: 4px 0;"><strong>Google Meet Link:</strong> <a href="${meetLink}" style="color: #2563eb; font-weight: bold;">${meetLink}</a></p>
              </div>

              <p style="font-size: 13px; color: #64748b;">Please be prepared to present your sprint progress and code deliverables on the call.</p>
              <p style="font-size: 13px; color: #475569; margin-top: 20px;">Warm regards,<br><strong style="color: #0f172a;">Mentorship Evaluation Committee</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
            </div>
          </div>
        `;

        await sendEmail({
          candidateId: candidate.id,
          to: candidate.email,
          recipientName: candidate.fullName,
          subject,
          html: htmlBody,
          text: `Sprint Review 1 scheduled for ${candidate.fullName} on ${rev1Date} at ${rev1Time}. Google Meet: ${meetLink}`,
          emailType: 'REVIEW',
          meetLink,
        });

        await prisma.taskAssignment.update({
          where: { id: task.id },
          data: {
            firstReviewDate: rev1Date,
            firstReviewStatus: 'Scheduled',
            reviewCount: 1,
            reviewDate: rev1Date,
            reviewTime: rev1Time,
          },
        });

        await prisma.candidate.update({
          where: { id: candidate.id },
          data: {
            reviewCycle: 1,
            taskStatus: 'Under Review 1',
          },
        });

        scheduledReviews.push({
          candidateId: candidate.candidateId,
          fullName: candidate.fullName,
          cycle: 'Review 1',
          date: rev1Date,
          time: rev1Time,
        });
      }
      // Review 2: Scheduled 2 days after Review 1
      else if (task.reviewCount === 1 && candidate.reviewCycle === 1) {
        const rev2DateObj = addDays(today, 2);
        const rev2Date = formatToDdMmYy(rev2DateObj);
        const rev2Time = getRandomIstTime();
        const meetLink = task.meetLink || generateGoogleMeetLink();
        const automatedFeedback = generateGemmaFeedback(candidate.role, 1);

        const subject = `Scheduled: Internship Sprint Review 2 & Evaluation - ${candidate.fullName} | Shortfundly`;
        const htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #090d16, #1e293b); padding: 26px 24px; text-align: center; border-bottom: 3px solid #38bdf8;">
              <h1 style="color: #38bdf8; margin: 0; font-size: 22px; letter-spacing: 1.5px;">SHORTFUNDLY SPRINT REVIEW 2</h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Role: ${candidate.role} • Technical Evaluation 2 & Automated Feedback</p>
            </div>
            <div style="padding: 28px 24px;">
              <p style="font-size: 15px;">Dear <strong>${candidate.fullName}</strong>,</p>
              <p>Your second review milestone has been scheduled by the automated curriculum engine.</p>
              
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 18px; margin: 20px 0; border-radius: 8px;">
                <h4 style="margin: 0 0 8px 0; color: #1e293b; font-size: 15px;">Preliminary AI Evaluation Feedback</h4>
                <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0; white-space: pre-wrap;">${automatedFeedback}</p>
              </div>

              <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 18px; margin: 20px 0; border-radius: 6px;">
                <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 15px;">Review 2 Meeting Schedule</h4>
                <p style="margin: 4px 0;"><strong>Sprint Task:</strong> ${task.title}</p>
                <p style="margin: 4px 0;"><strong>Date:</strong> ${rev2Date} (2 days after Review 1)</p>
                <p style="margin: 4px 0;"><strong>Time Slot:</strong> ${rev2Time}</p>
                <p style="margin: 4px 0;"><strong>Google Meet Link:</strong> <a href="${meetLink}" style="color: #2563eb; font-weight: bold;">${meetLink}</a></p>
              </div>

              <p style="font-size: 13px; color: #64748b;">Warm regards,<br><strong style="color: #0f172a;">Mentorship Evaluation Committee</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
            </div>
          </div>
        `;

        await sendEmail({
          candidateId: candidate.id,
          to: candidate.email,
          recipientName: candidate.fullName,
          subject,
          html: htmlBody,
          text: `Sprint Review 2 scheduled for ${candidate.fullName} on ${rev2Date} at ${rev2Time}. Feedback: ${automatedFeedback}. Google Meet: ${meetLink}`,
          emailType: 'REVIEW',
          meetLink,
        });

        await prisma.taskAssignment.update({
          where: { id: task.id },
          data: {
            secondReviewDate: rev2Date,
            secondReviewStatus: 'Scheduled',
            secondReviewFeedback: automatedFeedback,
            reviewCount: 2,
          },
        });

        await prisma.candidate.update({
          where: { id: candidate.id },
          data: {
            reviewCycle: 2,
            taskStatus: 'Under Review 2',
          },
        });

        scheduledReviews.push({
          candidateId: candidate.candidateId,
          fullName: candidate.fullName,
          cycle: 'Review 2',
          date: rev2Date,
          time: rev2Time,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processedCount: candidates.length,
      scheduledCount: scheduledReviews.length,
      scheduledReviews,
    });
  } catch (error) {
    console.error('[Process Reviews Cron Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
