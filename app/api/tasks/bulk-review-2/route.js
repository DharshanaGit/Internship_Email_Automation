import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createIcsCalendarInvite } from '@/lib/googleCalendar';
import { sendEmail } from '@/lib/mailer';
import { getReviewTwoSchedule } from '@/lib/dateUtils';
import { getOrCreateCandidateMeetLink } from '@/lib/googleMeet';

export async function POST(request) {
  try {
    const body = await request.json();
    const { reviews = [], globalCc, customSubject: globalCustomSubject, customBody: globalCustomBody } = body;

    if (!Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one candidate review item is required.' }, { status: 400 });
    }

    const results = [];

    for (const item of reviews) {
      try {
        const { taskId, candidateId, feedback, reviewDate, reviewTime, cc } = item;

        let task = null;
        if (taskId) {
          task = await prisma.taskAssignment.findUnique({
            where: { id: taskId },
            include: { candidate: true },
          });
        } else if (candidateId) {
          const c = await prisma.candidate.findUnique({
            where: { id: candidateId },
            include: { tasks: { orderBy: { createdAt: 'desc' }, take: 1 } },
          });
          if (c && c.tasks.length > 0) {
            task = { ...c.tasks[0], candidate: c };
          }
        }

        if (!task || !task.candidate) {
          results.push({ taskId, success: false, error: 'Task or candidate not found' });
          continue;
        }

        const candidate = task.candidate;
        const manualFeedback = feedback?.trim() || 'Sprint deliverables verified by mentor. Proceed with technical feedback review.';
        const schedule = getReviewTwoSchedule(task.firstReviewDate || task.reviewDate || new Date());
        const finalReviewDate = reviewDate || schedule.callDateStr;
        const finalReviewTime = reviewTime || schedule.timeStr;

        let meetUrl = candidate.googleMeetUrl || task.meetLink;
        if (!meetUrl || meetUrl.includes('undefined')) {
          meetUrl = await getOrCreateCandidateMeetLink(candidate, finalReviewDate);
        }

        const icsInvite = createIcsCalendarInvite({
          uid: `sf-task-bulkrev2-${task.id}-${Date.now()}@shortfundly.com`,
          title: `[Shortfundly] Review 2 Call & Evaluation - ${candidate.fullName}`,
          description: `Review 2 for milestone sprint: ${task.title}.\n\nMentor Feedback:\n${manualFeedback}\n\nJoin Google Meet: ${meetUrl}`,
          meetLink: meetUrl,
          startDateStr: new Date().toISOString().split('T')[0],
          startTimeStr: '15:00',
          durationMinutes: 45,
          attendeeEmail: candidate.email,
          attendeeName: candidate.fullName,
        });

        const rawSubject = item.customSubject || item.subject || globalCustomSubject;
        const subject = rawSubject
          ? rawSubject
              .replace(/{{candidate_name}}/gi, candidate.fullName)
              .replace(/{{designation}}/gi, candidate.role)
              .replace(/{{review_date}}/gi, finalReviewDate)
              .replace(/{{review_time}}/gi, finalReviewTime)
              .replace(/{{meet_link}}/gi, meetUrl)
          : `Review 2 Call & Feedback - ${candidate.fullName} | Shortfundly`;

        const rawBody = item.customBody || item.body || globalCustomBody;
        const formattedCustomBody = rawBody
          ? rawBody
              .replace(/{{candidate_name}}/gi, candidate.fullName)
              .replace(/{{designation}}/gi, candidate.role)
              .replace(/{{review_date}}/gi, finalReviewDate)
              .replace(/{{review_time}}/gi, finalReviewTime)
              .replace(/{{meet_link}}/gi, meetUrl)
          : null;

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #090d16, #1e293b); padding: 26px 24px; text-align: center; border-bottom: 3px solid #f59e0b;">
              <h1 style="color: #fbbf24; margin: 0; font-size: 22px; letter-spacing: 1.5px;">SHORTFUNDLY SPRINT REVIEW 2</h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Role: ${candidate.role} • Technical Evaluation 2 & Mentor Feedback</p>
            </div>
            <div style="padding: 28px 24px;">
              <p style="font-size: 15px;">Dear <strong>${candidate.fullName}</strong>,</p>
              ${formattedCustomBody ? `
              <div style="margin: 16px 0; font-size: 14px; color: #334155; white-space: pre-line;">
                ${formattedCustomBody}
              </div>` : `
              <p>Your submissions for milestone sprint <strong>${task.title}</strong> have been reviewed by your mentor and HR evaluation committee:</p>`}
              
              <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin: 0 0 6px 0; color: #b45309; font-size: 14px;">Mentor & HR Review Feedback:</h4>
                <p style="margin: 0; color: #92400e; font-size: 13.5px; white-space: pre-line;">${manualFeedback}</p>
              </div>

              <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin: 0 0 6px 0; color: #1e3a8a; font-size: 14px;">Second Review Call Schedule:</h4>
                <p style="margin: 4px 0;"><strong>Second Review Date:</strong> ${finalReviewDate}</p>
                <p style="margin: 4px 0;"><strong>Time (IST):</strong> ${finalReviewTime}</p>
                <p style="margin: 8px 0 0 0;"><strong>Google Meet Link:</strong> <a href="${meetUrl}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${meetUrl}</a></p>
              </div>

              <p style="font-size: 13px; color: #64748b;">Please review the mentor feedback above and be ready to present your updated work. An official calendar invitation (.ics) is attached.</p>
              <p style="margin-top: 24px; font-size: 13px; color: #475569;">Best regards,<br><strong style="color: #0f172a;">Technical Mentorship & HR Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
            </div>
          </div>
        `;

        const dispatchCc = [cc, globalCc].filter(Boolean).join(', ');

        await sendEmail({
          candidateId: candidate.id,
          to: candidate.email,
          recipientName: candidate.fullName,
          cc: dispatchCc || undefined,
          subject,
          html: emailHtml,
          text: `Review 2 scheduled for ${finalReviewDate} at ${finalReviewTime}. Feedback: ${manualFeedback}. Meet: ${meetUrl}`,
          emailType: 'TASK_REVIEW_2',
          meetLink: meetUrl,
          attachments: [
            {
              filename: 'review2_invite.ics',
              content: icsInvite,
              contentType: 'text/calendar; charset=utf-8; method=REQUEST',
            },
          ],
        });

        await prisma.taskAssignment.update({
          where: { id: task.id },
          data: {
            secondReviewDate: finalReviewDate,
            secondReviewStatus: 'Scheduled',
            secondReviewFeedback: manualFeedback,
            reviewDate: finalReviewDate,
            reviewTime: finalReviewTime,
            status: 'Review 2 Scheduled',
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

        results.push({
          candidateId: candidate.id,
          fullName: candidate.fullName,
          success: true,
          reviewDate: finalReviewDate,
        });
      } catch (err) {
        results.push({ taskId: item.taskId, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Bulk Review 2 dispatched to ${successCount} candidates with manual mentor feedbacks!`,
      dispatchedCount: successCount,
      results,
    });
  } catch (error) {
    console.error('Bulk review 2 error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
