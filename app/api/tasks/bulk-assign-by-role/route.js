export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma.js';
import { getTaskPresetForRole } from '@/lib/automationEngine.js';
import { generateGemmaTask, getTaskByRoleAndTier } from '@/lib/gemmaEngine.js';
import { getExplanationSchedule, getReviewOneSchedule } from '@/lib/dateUtils.js';
import { generateGoogleMeetLink, createIcsCalendarInvite } from '@/lib/googleCalendar.js';
import { createRealMeetLink, getOrCreateCandidateMeetLink } from '@/lib/googleMeet.js';
import { sendEmail } from '@/lib/mailer.js';
import { enqueueBulkTasks } from '@/lib/queueWorker.js';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3001';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      candidateIds,
      role,
      batch,
      sameTaskForAll = true,
      tier = 'Developer',
      sharedTaskId,
      sharedTaskTitle,
      sharedTaskObjective,
      sharedModules,
      sharedTools,
      sharedRequirements,
      explanationDate: customExpDate,
      explanationTime: customExpTime,
      deadline: customDeadline,
      scheduledSendAt,
      customSubject,
      customBody,
      cc,
    } = body;

    // Support explicit candidateIds selection or role/batch-based filtering
    const where = {};

    if (candidateIds && Array.isArray(candidateIds) && candidateIds.length > 0) {
      where.id = { in: candidateIds };
    } else {
      where.offerLetterStatus = { in: ['Sent', 'Accepted'] };
      if (role && role !== 'ALL') {
        where.role = { contains: role };
      }
      if (batch && batch !== 'ALL') {
        where.batch = { contains: batch };
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

    const results = [];

    for (const candidate of candidatesToAssign) {
      try {
        // 1. Role-specific task: Same task across role or separate individual tasks
        let taskTitle, taskDesc, taskIdVal, modulesVal, toolsVal, reqsVal;

        if (sameTaskForAll && (sharedTaskTitle || sharedTaskObjective)) {
          taskIdVal = sharedTaskId || `TSK-${String(Math.floor(Math.random() * 9000) + 1000)}`;
          taskTitle = sharedTaskTitle;
          taskDesc = sharedTaskObjective;
          modulesVal = sharedModules || null;
          toolsVal = sharedTools || null;
          reqsVal = sharedRequirements || null;
        } else {
          const tieredTask = getTaskByRoleAndTier(candidate.role, tier);
          taskIdVal = tieredTask.taskId;
          taskTitle = tieredTask.taskName;
          taskDesc = tieredTask.objective;
          modulesVal = tieredTask.modules;
          toolsVal = tieredTask.toolsAndTech;
          reqsVal = tieredTask.clientRequirements;
        }

        // 2. Schedule: HR specified or auto-scheduled
        const expSchedule = getExplanationSchedule(new Date());
        const finalExpDate = customExpDate || expSchedule.dateStr;
        const finalExpTime = customExpTime || expSchedule.timeStr;
        const rev1Schedule = getReviewOneSchedule(finalExpDate);

        const finalDeadline = customDeadline
          ? new Date(customDeadline)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // 3. Unique submission link per candidate
        const submissionToken = crypto.randomBytes(24).toString('hex');
        const submissionUrl = `${APP_URL}/tasks/submit?token=${submissionToken}`;

        // 4. Backend checks Database: Does candidate have a google_meet_url?
        //    NO  --> Calls Google Calendar API (conferenceDataVersion: 1), stores in candidates.google_meet_url
        //    YES --> Reuses existing stored link
        const meetLink = await getOrCreateCandidateMeetLink(candidate, finalExpDate);

        // 5. Save Task Assignment in DB
        const task = await prisma.taskAssignment.create({
          data: {
            candidateId: candidate.id,
            taskNumber: (candidate.tasksCompleted || 0) + 1,
            taskId: taskIdVal,
            taskName: taskTitle,
            title: taskTitle,
            objective: taskDesc,
            modules: modulesVal,
            toolsAndTech: toolsVal,
            clientRequirements: reqsVal,
            description: taskDesc,
            role: candidate.role,
            explanationDate: finalExpDate,
            explanationTime: finalExpTime,
            meetLink,
            reviewDate: rev1Schedule.callDateStr,
            reviewTime: rev1Schedule.timeStr,
            deadline: finalDeadline,
            scheduledSendAt: scheduledSendAt ? new Date(scheduledSendAt) : null,
            isSent: true,
            submissionToken,
            submissionStatus: 'PENDING',
            status: 'Assigned',
            reviewCount: 0,
          },
        });

        // 6. Generate RFC-5545 iCalendar invite (.ics)
        const icsInvite = createIcsCalendarInvite({
          uid: `sf-task-exp-${task.id}@shortfundly.com`,
          title: `[Shortfundly] Role Sprint Briefing - ${candidate.role} (${candidate.fullName})`,
          description: `Task: ${taskTitle}\n\nDeliverables:\n${taskDesc}\n\nJoin Google Meet: ${meetLink}\nSubmission: ${submissionUrl}`,
          meetLink,
          startDateStr: new Date().toISOString().split('T')[0],
          startTimeStr: '11:00',
          durationMinutes: 45,
          attendeeEmail: candidate.email,
          attendeeName: candidate.fullName,
        });

        // 7. Dispatch Email
        const emailSubject = customSubject
          ? customSubject
              .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
              .replace(/\{\{designation\}\}/g, candidate.role)
              .replace(/\{\{task_title\}\}/g, taskTitle)
          : `Task Assignment & Virtual Explanation Call - ${candidate.role} | Shortfundly`;

        const emailHtml = customBody
          ? `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
              ${customBody
                .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
                .replace(/\{\{email\}\}/g, candidate.email)
                .replace(/\{\{designation\}\}/g, candidate.role)
                .replace(/\{\{task_title\}\}/g, taskTitle)
                .replace(/\{\{task_content\}\}/g, taskDesc.replace(/\n/g, '<br>'))
                .replace(/\{\{explanation_date\}\}/g, finalExpDate)
                .replace(/\{\{time\}\}/g, finalExpTime)
                .replace(/\{\{meet_link\}\}/g, meetLink)
                .replace(/\{\{submission_link\}\}/g, submissionUrl)
                .replace(/\n/g, '<br>')}
              <div style="text-align: center; margin: 20px 0;">
                <a href="${submissionUrl}" style="display: inline-block; padding: 12px 24px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Open Deliverable Submission Portal</a>
              </div>
            </div>`
          : `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
              <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #2563eb;">
                <h1 style="color: #60a5fa; margin: 0; font-size: 22px; letter-spacing: 1.5px;">SHORTFUNDLY TASK ASSIGNMENT</h1>
                <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Role: ${candidate.role} &bull; Milestone Deliverables</p>
              </div>
              <div style="padding: 28px 24px;">
                <p style="font-size: 15px; margin-top: 0;">Dear <strong>${candidate.fullName}</strong>,</p>
                <p>Your technical assignment for the <strong>${candidate.role}</strong> internship has been assigned. Please find your sprint deliverables below:</p>
                
                <div style="background: #0f172a; color: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #334155;">
                  <h3 style="color: #38bdf8; margin-top: 0; font-size: 16px;">[${taskIdVal}] ${taskTitle}</h3>
                  <div style="white-space: pre-wrap; font-size: 13px; line-height: 1.6; color: #cbd5e1; margin-bottom: 0;">${taskDesc}</div>
                  ${modulesVal ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;"><strong>Modules:</strong> ${modulesVal}</p>` : ''}
                  ${toolsVal ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;"><strong>Tech Stack:</strong> ${toolsVal}</p>` : ''}
                </div>

                <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 6px;">
                  <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 14px;">Virtual Explanation Call Schedule:</h4>
                  <p style="margin: 3px 0;"><strong>Date:</strong> ${finalExpDate}</p>
                  <p style="margin: 3px 0;"><strong>Time Slot:</strong> ${finalExpTime}</p>
                  <p style="margin: 3px 0;"><strong>Google Meet Link:</strong> <a href="${meetLink}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${meetLink}</a></p>
                </div>

                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; margin: 20px 0;">
                  <h4 style="margin: 0 0 8px 0; color: #166534; font-size: 14px;">Project Deliverable Submission:</h4>
                  <p style="margin: 3px 0; font-size: 13px;"><strong>Submission Deadline:</strong> ${finalDeadline.toLocaleString()}</p>
                  <div style="text-align: center; margin: 16px 0;">
                    <a href="${submissionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px;">Open Submission Portal</a>
                  </div>
                  <p style="margin: 0; font-size: 11px; color: #64748b; text-align: center;">Notice: This unique submission URL strictly expires on ${finalDeadline.toLocaleString()}. Failure to submit on time incurs an automated performance deduction.</p>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #64748b; margin: 0;">Shortfundly Media Technologies Pvt. Ltd. &bull; No. 12, Anna Salai, Chennai, Tamil Nadu, 600002, India.</p>
              </div>
            </div>
          `;

        const emailResult = await sendEmail({
          candidateId: candidate.id,
          to: candidate.email,
          recipientName: candidate.fullName,
          cc: cc || undefined,
          subject: emailSubject,
          html: emailHtml,
          text: `Dear ${candidate.fullName}, your task [${taskIdVal}] for ${candidate.role} has been assigned. Explanation date: ${finalExpDate} at ${finalExpTime}. Google Meet: ${meetLink}. Submission deadline: ${finalDeadline.toLocaleString()} at: ${submissionUrl}`,
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

        await prisma.candidate.update({
          where: { id: candidate.id },
          data: { taskStatus: 'In Progress' },
        });

        results.push({
          candidateId: candidate.id,
          candidateName: candidate.fullName,
          email: candidate.email,
          role: candidate.role,
          taskTitle,
          meetLink,
          submissionUrl,
          status: 'SUCCESS',
        });
      } catch (candErr) {
        console.error(`Task dispatch error for ${candidate.fullName}:`, candErr);
        results.push({
          candidateId: candidate.id,
          candidateName: candidate.fullName,
          status: 'FAILED',
          error: candErr.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      assignedCount: results.filter((r) => r.status === 'SUCCESS').length,
      failedCount: results.filter((r) => r.status === 'FAILED').length,
      results,
    });
  } catch (error) {
    console.error('Bulk task assignment error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
