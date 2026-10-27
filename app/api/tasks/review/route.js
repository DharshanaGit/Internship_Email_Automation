export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateGemmaFeedback } from '@/lib/gemmaEngine';
import { getReviewOneSchedule, getReviewTwoSchedule } from '@/lib/dateUtils';
import { createIcsCalendarInvite } from '@/lib/googleCalendar';
import { createRealMeetLink, getOrCreateCandidateMeetLink } from '@/lib/googleMeet';
import { sendEmail } from '@/lib/mailer';
import { recordTaskCompletion } from '@/lib/excelTaskUpdater';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, taskId, feedback, isTaskComplete } = body;

    let task = null;
    let candidate = null;

    if (taskId) {
      task = await prisma.taskAssignment.findUnique({
        where: { id: taskId },
        include: { candidate: true },
      });
      if (task) {
        candidate = task.candidate;
      }
    }

    // If task not found by taskId or manual candidate entry provided (not fixed CSV data)
    if (!candidate && (body.candidateId || body.candidateEmail || body.email)) {
      const emailToLookup = body.candidateEmail || body.email;
      if (body.candidateId) {
        candidate = await prisma.candidate.findUnique({
          where: { id: body.candidateId },
          include: { tasks: { orderBy: { createdAt: 'desc' }, take: 1 } },
        });
      }
      if (!candidate && emailToLookup) {
        candidate = await prisma.candidate.findUnique({
          where: { email: emailToLookup.trim() },
          include: { tasks: { orderBy: { createdAt: 'desc' }, take: 1 } },
        });
      }

      // If still not found and candidateName + email are given, create candidate record dynamically!
      if (!candidate && body.candidateName && emailToLookup) {
        candidate = await prisma.candidate.create({
          data: {
            candidateId: `SF-MANUAL-${Date.now().toString().slice(-4)}`,
            fullName: body.candidateName.trim(),
            email: emailToLookup.trim(),
            role: body.role || body.designation || 'Intern',
            department: 'Engineering',
            joiningDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
            duration: '3 Months',
            workMode: 'Online - Remote',
            offerLetterStatus: 'Sent',
            taskStatus: 'Under Review',
            tasksCompleted: 0,
            googleMeetUrl: body.meetLink || null,
          },
          include: { tasks: true },
        });
      }

      if (candidate) {
        if (candidate.tasks && candidate.tasks.length > 0) {
          task = candidate.tasks[0];
        } else {
          task = await prisma.taskAssignment.create({
            data: {
              candidateId: candidate.id,
              title: body.reviewTitle || `${candidate.role} Milestone Sprint`,
              description: body.feedbackNotes || 'Sprint milestone deliverables review.',
              explanationDate: body.reviewDate || new Date().toISOString().split('T')[0],
              explanationTime: body.reviewTime || '11:00 AM IST',
              meetLink: body.meetLink || candidate.googleMeetUrl || 'https://meet.google.com/sf-sync',
              status: `${body.reviewTitle || 'Review'} Scheduled`,
            },
          });
        }
      }
    }

    if (!candidate || !task) {
      return NextResponse.json({ success: false, error: 'Candidate and task assignment details required.' }, { status: 400 });
    }

    // SCENARIO A: TASK COMPLETION - STOP REVIEW LOOPS
    if (isTaskComplete || action === 'complete') {
      const completionFeedback = feedback || 'Milestone deliverables successfully verified and approved.';
      
      // Update SQLite and automatically update Excel sheet on disk with 'No of tasks completed'
      const updaterResult = await recordTaskCompletion(candidate.id, completionFeedback);

      // Dispatch Task Completed email
      const emailHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #10b981;">
            <h1 style="color: #34d399; margin: 0; font-size: 24px; letter-spacing: 2px;">TASK COMPLETED & APPROVED</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Shortfundly Media Technologies Pvt. Ltd.</p>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
            <p>Congratulations! Your milestone task <strong>${task.title}</strong> has been officially approved and marked as <strong>COMPLETED</strong>.</p>
            <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
              <h4 style="margin: 0 0 6px 0; color: #047857;">Mentor Feedback:</h4>
              <p style="margin: 0; color: #065f46; white-space: pre-line;">${completionFeedback}</p>
            </div>
            <p>Your record has been updated with <strong>${updaterResult.tasksCompleted} completed milestone(s)</strong>. You are now eligible to receive your official Shortfundly Internship Certificate.</p>
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
        text: `Dear ${candidate.fullName}, your task has been completed and approved. Total completed: ${updaterResult.tasksCompleted}.`,
        emailType: 'TASK_COMPLETED',
      });

      return NextResponse.json({
        success: true,
        message: `Task marked complete! Excel spreadsheet updated with 'No of tasks completed: ${updaterResult.tasksCompleted}'.`,
        tasksCompleted: updaterResult.tasksCompleted,
      });
    }

    // SCENARIO B: REVIEW 1 DISPATCH (Only Review Date, Time, Google Meet link - NO FEEDBACK for Review 1)
    if (action === 'review_1' || action === 'send_next_review') {
      const schedule = getReviewOneSchedule(task.explanationDate || new Date());
      const persistentMeetLink = candidate.googleMeetUrl || task.meetLink || (await getOrCreateCandidateMeetLink(candidate, schedule.callDateStr));

      const icsInvite = createIcsCalendarInvite({
        uid: `sf-task-rev1-${task.id}@shortfundly.com`,
        title: `[Shortfundly] Review 1 Call - ${candidate.role} (${candidate.fullName})`,
        description: `Review 1 for task: ${task.title}.\n\nSame Google Meet Link: ${persistentMeetLink}`,
        meetLink: persistentMeetLink,
        startDateStr: new Date().toISOString().split('T')[0],
        startTimeStr: '14:00',
        durationMinutes: 45,
        attendeeEmail: candidate.email,
        attendeeName: candidate.fullName,
      });

      const emailHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #3b82f6;">
            <h1 style="color: #60a5fa; margin: 0; font-size: 24px; letter-spacing: 2px;">REVIEW 1 SCHEDULED</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Shortfundly Milestone Evaluation Loop</p>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
            <p>Following your virtual explanation call, your <strong>First Milestone Review</strong> has been scheduled:</p>
            
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Task:</strong> ${task.title}</p>
              <p style="margin: 4px 0;"><strong>Review Date:</strong> ${schedule.callDateStr}</p>
              <p style="margin: 4px 0;"><strong>Time:</strong> ${schedule.timeStr}</p>
              <p style="margin: 8px 0 0 0;"><strong>Google Meet Link (Same Link):</strong> <a href="${persistentMeetLink}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${persistentMeetLink}</a></p>
            </div>

            <p>Please prepare your progress demo and deliverables for evaluation on this call.</p>
            <p style="margin-top: 24px;">Best regards,<br><strong>Technical Mentorship & HR Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
          </div>
        </div>
      `;

      await sendEmail({
        candidateId: candidate.id,
        to: candidate.email,
        recipientName: candidate.fullName,
        cc: body.cc || undefined,
        subject: `Review 1 Call Scheduled - ${candidate.fullName} | Shortfundly`,
        html: emailHtml,
        text: `Review 1 call scheduled for ${schedule.callDateStr} at ${schedule.timeStr}. Meet: ${persistentMeetLink}`,
        emailType: 'TASK_REVIEW_1',
        meetLink: persistentMeetLink,
        attachments: [
          {
            filename: 'review1_invite.ics',
            content: icsInvite,
            contentType: 'text/calendar; charset=utf-8; method=REQUEST',
          },
        ],
      });

      await prisma.taskAssignment.update({
        where: { id: task.id },
        data: {
          firstReviewDate: schedule.callDateStr,
          firstReviewStatus: 'Scheduled',
          reviewDate: schedule.callDateStr,
          reviewTime: schedule.timeStr,
          status: 'Review 1 Scheduled',
          reviewCount: 1,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Review 1 scheduled for ${schedule.callDateStr} at ${schedule.timeStr}!`,
        reviewDate: schedule.callDateStr,
        reviewTime: schedule.timeStr,
      });
    }

    // SCENARIO C: REVIEW 2 DISPATCH (Manual filling process for HR/mentor feedback, 2 days after review 1, same Meet link)
    if (action === 'review_2') {
      const manualFeedback = feedback?.trim() || 'Sprint deliverables evaluated by mentor. Review agenda items recorded.';
      const schedule = getReviewTwoSchedule(task.firstReviewDate || task.reviewDate || new Date());
      const persistentMeetLink = candidate.googleMeetUrl || task.meetLink || (await getOrCreateCandidateMeetLink(candidate, schedule.callDateStr));

      const icsInvite = createIcsCalendarInvite({
        uid: `sf-task-rev2-${task.id}@shortfundly.com`,
        title: `[Shortfundly] Review 2 Call with Feedback - ${candidate.role} (${candidate.fullName})`,
        description: `Review 2 for task: ${task.title}.\n\nMentor Feedback:\n${manualFeedback}\n\nSame Google Meet Link: ${persistentMeetLink}`,
        meetLink: persistentMeetLink,
        startDateStr: new Date().toISOString().split('T')[0],
        startTimeStr: '15:00',
        durationMinutes: 45,
        attendeeEmail: candidate.email,
        attendeeName: candidate.fullName,
      });

      const emailHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #f59e0b;">
            <h1 style="color: #fbbf24; margin: 0; font-size: 24px; letter-spacing: 2px;">REVIEW 2 & MENTOR EVALUATION</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Shortfundly Milestone Evaluation Loop</p>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
            <p>Your submissions for <strong>${task.title}</strong> have been evaluated by your mentor and HR committee with customized feedback:</p>
            
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
              <h4 style="margin: 0 0 6px 0; color: #b45309;">Mentor & HR Review Feedback:</h4>
              <p style="margin: 0; color: #92400e; white-space: pre-line;">${manualFeedback}</p>
            </div>

            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
              <h4 style="margin: 0 0 6px 0; color: #1d4ed8;">Second Review Call Schedule:</h4>
              <p style="margin: 4px 0;"><strong>Second Review Date:</strong> ${schedule.callDateStr}</p>
              <p style="margin: 4px 0;"><strong>Time:</strong> ${schedule.timeStr}</p>
              <p style="margin: 8px 0 0 0;"><strong>Google Meet Link (Same Link):</strong> <a href="${persistentMeetLink}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${persistentMeetLink}</a></p>
            </div>

            <p style="margin-top: 24px;">Best regards,<br><strong>Technical Mentorship & HR Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
          </div>
        </div>
      `;

      await sendEmail({
        candidateId: candidate.id,
        to: candidate.email,
        recipientName: candidate.fullName,
        cc: body.cc || undefined,
        subject: `Review 2 Call & Feedback - ${candidate.fullName} | Shortfundly`,
        html: emailHtml,
        text: `Review 2 scheduled for ${schedule.callDateStr} at ${schedule.timeStr}. Feedback: ${manualFeedback}. Meet: ${persistentMeetLink}`,
        emailType: 'TASK_REVIEW_2',
        meetLink: persistentMeetLink,
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
          secondReviewDate: schedule.callDateStr,
          secondReviewStatus: 'Scheduled',
          secondReviewFeedback: manualFeedback,
          reviewDate: schedule.callDateStr,
          reviewTime: schedule.timeStr,
          status: 'Review 2 Scheduled',
          reviewCount: 2,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Review 2 scheduled with mentor feedback for ${schedule.callDateStr}!`,
        reviewDate: schedule.callDateStr,
        reviewTime: schedule.timeStr,
        feedback: manualFeedback,
      });
    }

    // SCENARIO D: MANUAL REVIEW FLOW (Admin custom candidate, date, time, Meet link, and manual feedback)
    if (action === 'manual_review') {
      const {
        reviewTitle = 'Milestone Sprint Review',
        reviewType = 'review_1',
        reviewDate,
        reviewTime = '11:00 AM IST',
        meetLink,
        feedbackNotes = '',
        cc,
        customSubject,
        customBody,
      } = body;

      const scheduleDate = reviewDate || task.reviewDate || '25.10.26';
      
      // Ensure real active Google Meet link from candidate's stored google_meet_url or provision new via Calendar API
      let scheduleMeetLink = meetLink;
      if (!scheduleMeetLink || scheduleMeetLink.includes('undefined')) {
        scheduleMeetLink = await getOrCreateCandidateMeetLink(candidate, scheduleDate);
      }

      const isReview1 = reviewType === 'review_1' || reviewTitle?.toLowerCase().includes('review 1');

      const icsInvite = createIcsCalendarInvite({
        uid: `sf-task-manualrev-${task.id}-${Date.now()}@shortfundly.com`,
        title: `[Shortfundly] ${reviewTitle} - ${candidate.fullName}`,
        description: isReview1
          ? `Review 1 for task: ${task.title}.\n\nScheduled Date: ${scheduleDate} at ${reviewTime}\nJoin Google Meet: ${scheduleMeetLink}`
          : `Review for task: ${task.title}.\n\nMentor Feedback:\n${feedbackNotes}\n\nJoin Google Meet: ${scheduleMeetLink}`,
        meetLink: scheduleMeetLink,
        startDateStr: new Date().toISOString().split('T')[0],
        startTimeStr: '11:00',
        durationMinutes: 45,
        attendeeEmail: candidate.email,
        attendeeName: candidate.fullName,
      });

      const subject = customSubject || `[Shortfundly] ${reviewTitle} - ${candidate.fullName} (${candidate.role})`;

      const defaultContentHtml = isReview1
        ? `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
            <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #3b82f6;">
              <h1 style="color: #60a5fa; margin: 0; font-size: 24px; letter-spacing: 2px;">SHORTFUNDLY</h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">${reviewTitle}</p>
            </div>
            <div style="padding: 28px;">
              <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
              <p>Following your virtual explanation call, your <strong>First Milestone Review</strong> has been scheduled:</p>
              
              <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Session Type:</strong> ${reviewTitle}</p>
                <p style="margin: 4px 0;"><strong>Scheduled Date:</strong> ${scheduleDate}</p>
                <p style="margin: 4px 0;"><strong>Time (IST):</strong> ${reviewTime}</p>
                <p style="margin: 8px 0 0 0;"><strong>Google Meet Link:</strong> <a href="${scheduleMeetLink}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${scheduleMeetLink}</a></p>
              </div>

              <p>Please prepare your progress demo and deliverables for evaluation on this call. An official calendar invitation (.ics) is attached.</p>
              <p style="margin-top: 24px;">Best regards,<br><strong>Technical Mentorship & HR Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
            </div>
          </div>
        `
        : `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
            <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #f59e0b;">
              <h1 style="color: #fbbf24; margin: 0; font-size: 24px; letter-spacing: 2px;">SHORTFUNDLY</h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">${reviewTitle}</p>
            </div>
            <div style="padding: 28px;">
              <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
              <p>Your mentor has scheduled a review session for your milestone sprint: <strong>${task.title}</strong>.</p>
              
              <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Session Type:</strong> ${reviewTitle}</p>
                <p style="margin: 4px 0;"><strong>Scheduled Date:</strong> ${scheduleDate}</p>
                <p style="margin: 4px 0;"><strong>Time (IST):</strong> ${reviewTime}</p>
                <p style="margin: 8px 0 0 0;"><strong>Google Meet Link:</strong> <a href="${scheduleMeetLink}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${scheduleMeetLink}</a></p>
              </div>

              ${feedbackNotes?.trim() ? `
              <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin: 0 0 6px 0; color: #b45309; font-size: 13px;">Mentor Feedback & Review Agenda Notes:</h4>
                <p style="margin: 0; color: #92400e; font-size: 13px; white-space: pre-line;">${feedbackNotes}</p>
              </div>` : ''}

              <p>Please review the mentor feedback above and be ready to present your updated work. An official calendar invitation (.ics) is attached.</p>
              <p style="margin-top: 24px;">Best regards,<br><strong>Technical Mentorship & HR Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
            </div>
          </div>
        `;

      const htmlBody = customBody
        ? `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
            ${customBody
              .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
              .replace(/\{\{designation\}\}/g, candidate.role)
              .replace(/\{\{task_title\}\}/g, task.title)
              .replace(/\{\{review_date\}\}/g, scheduleDate)
              .replace(/\{\{time\}\}/g, reviewTime)
              .replace(/\{\{meet_link\}\}/g, scheduleMeetLink)
              .replace(/\{\{feedback\}\}/g, (feedbackNotes || '').replace(/\n/g, '<br>'))
              .replace(/\n/g, '<br>')}
          </div>`
        : defaultContentHtml;

      await sendEmail({
        candidateId: candidate.id,
        to: candidate.email,
        recipientName: candidate.fullName,
        cc: cc || undefined,
        subject,
        html: htmlBody,
        text: `Review scheduled for ${scheduleDate} at ${reviewTime}. Meet: ${scheduleMeetLink}`,
        emailType: isReview1 ? 'TASK_REVIEW_1' : 'TASK_REVIEW_2',
        meetLink: scheduleMeetLink,
        attachments: [
          {
            filename: 'manual_review_invite.ics',
            content: icsInvite,
            contentType: 'text/calendar; charset=utf-8; method=REQUEST',
          },
        ],
      });

      const updatedTask = await prisma.taskAssignment.update({
        where: { id: task.id },
        data: {
          reviewDate: scheduleDate,
          reviewTime,
          meetLink: scheduleMeetLink,
          status: `${reviewTitle} Scheduled`,
          reviewCount: { increment: 1 },
          feedback: isReview1 ? '' : feedbackNotes,
        },
      });

      if (isTaskComplete) {
        const updaterResult = await recordTaskCompletion(candidate.id, feedbackNotes);
        return NextResponse.json({
          success: true,
          message: `Manual review dispatched and task marked completed! Excel updated on disk with 'No of tasks completed: ${updaterResult.tasksCompleted}'.`,
          reviewDate: scheduleDate,
          reviewTime,
          tasksCompleted: updaterResult.tasksCompleted,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Manual review successfully scheduled and dispatched to ${candidate.fullName}!`,
        reviewDate: scheduleDate,
        reviewTime,
        task: updatedTask,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid review action specified.' }, { status: 400 });
  } catch (error) {
    console.error('Task review error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
