import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTaskPresetForRole } from '@/lib/automationEngine';
import { generateGemmaTask } from '@/lib/gemmaEngine';
import { getExplanationSchedule, getReviewOneSchedule } from '@/lib/dateUtils';
import { generateGoogleMeetLink, createIcsCalendarInvite } from '@/lib/googleCalendar';
import { createRealMeetLink, getOrCreateCandidateMeetLink } from '@/lib/googleMeet';
import { sendEmail } from '@/lib/mailer';
import { enqueueBulkTasks } from '@/lib/queueWorker';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { candidateIds, role, customSubject, customBody, cc } = body;

    // Support explicit candidateIds selection or role-based filtering
    const where = {};

    if (candidateIds && Array.isArray(candidateIds) && candidateIds.length > 0) {
      where.id = { in: candidateIds };
    } else {
      where.offerLetterStatus = { in: ['Sent', 'Accepted'] };
      if (role && role !== 'ALL') {
        where.role = { contains: role };
      }
    }

    const candidatesToAssign = await prisma.candidate.findMany({
      where,
      take: 500,
    });

    if (candidatesToAssign.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No eligible candidates found. Task emails can only be sent to candidates who have received their Offer Letter.',
        assignedCount: 0,
        results: [],
      });
    }

    if (!body.directDispatch) {
      await enqueueBulkTasks(candidatesToAssign, {
        customSubject,
        customBody,
        cc,
      });

      return NextResponse.json({
        success: true,
        queued: true,
        queuedCount: candidatesToAssign.length,
        assignedCount: candidatesToAssign.length,
        message: `Pushed ${candidatesToAssign.length} task assignments to the SQLite background queue. Dispatches are executing every 2–3 seconds.`,
      });
    }

    const results = [];

    for (const candidate of candidatesToAssign) {
      try {
        // 1. Role-specific task from Gemma Engine
        const gemmaTask = generateGemmaTask(candidate.role, candidate.tasksCompleted || 0);
        const preset = getTaskPresetForRole(candidate.role);
        const taskTitle = gemmaTask.title || `${candidate.role} - ${preset.title}`;
        const taskDesc = gemmaTask.description || preset.description;

        // 2. Schedule: Explanation call date 2 days after task mail sent, IST time (9 AM - 7 PM)
        const expSchedule = getExplanationSchedule(new Date());
        const rev1Schedule = getReviewOneSchedule(expSchedule.dateStr);

        // 3. Backend checks Database: Does candidate have a google_meet_url?
        //    NO  --> Calls Google Calendar API (conferenceDataVersion: 1), stores in candidates.google_meet_url
        //    YES --> Reuses existing stored link
        const meetLink = await getOrCreateCandidateMeetLink(candidate, expSchedule.dateStr);

        // 4. Save Task Assignment in DB
        const task = await prisma.taskAssignment.create({
          data: {
            candidateId: candidate.id,
            taskNumber: (candidate.tasksCompleted || 0) + 1,
            title: taskTitle,
            description: taskDesc,
            role: candidate.role,
            explanationDate: expSchedule.dateStr,
            explanationTime: expSchedule.timeStr,
            meetLink,
            reviewDate: rev1Schedule.callDateStr,
            reviewTime: rev1Schedule.timeStr,
            status: 'Assigned',
            reviewCount: 0,
          },
        });

        // 5. Generate RFC-5545 iCalendar invite (.ics)
        const icsInvite = createIcsCalendarInvite({
          uid: `sf-task-exp-${task.id}@shortfundly.com`,
          title: `[Shortfundly] Role Sprint Briefing - ${candidate.role} (${candidate.fullName})`,
          description: `Task: ${taskTitle}\n\nDeliverables:\n${taskDesc}\n\nJoin Google Meet: ${meetLink}`,
          meetLink,
          startDateStr: new Date().toISOString().split('T')[0],
          startTimeStr: '11:00',
          durationMinutes: 45,
          attendeeEmail: candidate.email,
          attendeeName: candidate.fullName,
        });

        // 6. Email subject & body template with placeholders replaced
        const subject = customSubject
          ? customSubject
              .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
              .replace(/\{\{designation\}\}/g, candidate.role)
              .replace(/\{\{task_title\}\}/g, taskTitle)
          : `Internship Task Assignment & Explanation Call - ${candidate.role} | Shortfundly`;

        const parsedBulkBody = customBody
          ? customBody
              .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
              .replace(/\{\{email\}\}/g, candidate.email)
              .replace(/\{\{designation\}\}/g, candidate.role)
              .replace(/\{\{role\}\}/g, candidate.role)
              .replace(/\{\{task_title\}\}/g, taskTitle)
              .replace(/\{\{task_content\}\}/g, taskDesc.replace(/\n/g, '<br>'))
              .replace(/\{\{task_description\}\}/g, taskDesc.replace(/\n/g, '<br>'))
              .replace(/\{\{explanation_date\}\}/g, expSchedule.dateStr)
              .replace(/\{\{time\}\}/g, expSchedule.timeStr)
              .replace(/\{\{explanation_time\}\}/g, expSchedule.timeStr)
              .replace(/\{\{meet_link\}\}/g, meetLink)
          : null;

        const htmlBody = parsedBulkBody
          ? (parsedBulkBody.includes('<') ? parsedBulkBody : `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">${parsedBulkBody.replace(/\n/g, '<br>')}</div>`)
          : `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
              <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #2563eb;">
                <h1 style="color: #60a5fa; margin: 0; font-size: 24px; letter-spacing: 2px;">SHORTFUNDLY</h1>
                <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Role Milestone Assignment & Virtual Explanation Call</p>
              </div>
              <div style="padding: 28px;">
                <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
                <p>Your milestone task tailored to your designation as <strong>${candidate.role}</strong> has been assigned:</p>
                
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
                  <h3 style="color: #1e293b; margin-top: 0; font-size: 16px;">${taskTitle}</h3>
                  <p style="color: #475569; font-size: 13.5px; white-space: pre-line; line-height: 1.6;">${taskDesc}</p>
                </div>

                <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
                  <h4 style="margin: 0 0 8px 0; color: #1d4ed8; font-size: 14px;">Virtual Explanation Call Schedule:</h4>
                  <p style="margin: 4px 0;"><strong>Explanation Date:</strong> ${expSchedule.dateStr}</p>
                  <p style="margin: 4px 0;"><strong>Time:</strong> ${expSchedule.timeStr}</p>
                  <p style="margin: 8px 0 0 0;"><strong>Joining Google Meet Link:</strong> <a href="${meetLink}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${meetLink}</a></p>
                </div>

                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 12.5px; color: #166534;">
                  <strong>Review Schedule:</strong> Your milestone review is scheduled exactly 2 days after the explanation call on <strong>${rev1Schedule.callDateStr}</strong> via the same Google Meet link.
                </div>

                <p style="margin-top: 24px;">Best regards,<br><strong>Technical Mentorship & HR Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
              </div>
            </div>
          `;

        // 7. Dispatch Email
        await sendEmail({
          candidateId: candidate.id,
          to: candidate.email,
          recipientName: candidate.fullName,
          cc: cc || undefined,
          subject,
          html: htmlBody,
          text: `Dear ${candidate.fullName}, your task for ${candidate.role} has been assigned. Explanation date: ${expSchedule.dateStr} at ${expSchedule.timeStr}. Meet: ${meetLink}`,
          emailType: 'TASK_ASSIGNMENT',
          meetLink,
          attachments: [
            {
              filename: 'task_explanation_invite.ics',
              content: icsInvite,
              contentType: 'text/calendar; charset=utf-8; method=REQUEST',
            },
          ],
        });

        // 8. Update Candidate Status
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: { taskStatus: 'In Progress' },
        });

        results.push({
          candidateId: candidate.candidateId,
          name: candidate.fullName,
          role: candidate.role,
          taskTitle,
          meetLink,
          explanationDate: expSchedule.dateStr,
          explanationTime: expSchedule.timeStr,
          reviewDate: rev1Schedule.callDateStr,
          success: true,
        });
      } catch (err) {
        results.push({
          candidateId: candidate.candidateId,
          name: candidate.fullName,
          role: candidate.role,
          success: false,
          error: err.message,
        });
      }
    }

    const successfulCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Successfully assigned role tasks to ${successfulCount} candidate(s) who received offer letters.`,
      assignedCount: successfulCount,
      results,
    });
  } catch (error) {
    console.error('Bulk assign error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
