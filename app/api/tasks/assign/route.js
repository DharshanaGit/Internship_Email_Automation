export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma.js';
import { generateGemmaTask } from '@/lib/gemmaEngine.js';
import { getExplanationSchedule, getReviewOneSchedule } from '@/lib/dateUtils.js';
import { createIcsCalendarInvite } from '@/lib/googleCalendar.js';
import { getOrCreateCandidateMeetLink } from '@/lib/googleMeet.js';
import { sendEmail } from '@/lib/mailer.js';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://internship-email-automation.vercel.app').replace(/\/+$/, '');

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      candidateIds,
      candidateId,
      candidateName,
      email,
      role,
      taskId: customTaskId,
      taskName: customTaskName,
      objective,
      modules,
      toolsAndTech,
      clientRequirements,
      title,
      description,
      explanationDate,
      explanationTime,
      deadline,
      scheduledSendAt,
      customMeetLink,
      customSubject,
      customBody,
      customJinja,
      cc,
      previewOnly = false,
    } = body;

    // 1. Resolve candidates list
    let targetCandidateIds = [];
    if (Array.isArray(candidateIds) && candidateIds.length > 0) {
      targetCandidateIds = candidateIds;
    } else if (candidateId) {
      targetCandidateIds = [candidateId];
    }

    let candidates = [];
    if (targetCandidateIds.length > 0) {
      candidates = await prisma.candidate.findMany({
        where: { id: { in: targetCandidateIds } },
      });
    } else if (email) {
      const cand = await prisma.candidate.findFirst({
        where: { email: { equals: email } },
      });
      if (cand) candidates = [cand];
    }

    // Auto-create fallback candidate if name and email provided but record doesn't exist
    if (candidates.length === 0 && candidateName && email) {
      const candId = `SF-INT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const newCand = await prisma.candidate.create({
        data: {
          candidateId: candId,
          internId: candId,
          fullName: candidateName,
          email,
          role: role || 'Web Developer Intern',
          department: 'Engineering',
          joiningDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          duration: '3 Months',
          reportingManager: 'Priyanka Nair',
          assignedMentor: 'Rahul Kapoor',
          offerLetterStatus: 'Accepted',
          taskStatus: 'Not Assigned',
        },
      });
      candidates = [newCand];
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid candidate found. Please select candidates or provide candidate details.' },
        { status: 400 }
      );
    }

    // Common Task Logistics Defaults
    const expSchedule = getExplanationSchedule(new Date());
    const finalExpDate = explanationDate || expSchedule.dateStr;
    const finalExpTime = explanationTime || expSchedule.timeStr;
    const rev1Schedule = getReviewOneSchedule(finalExpDate);

    const finalDeadline = deadline
      ? new Date(deadline)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const baseTaskId = customTaskId || `TSK-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    // Preview mode: return rendered preview for the first candidate
    if (previewOnly) {
      const sampleCand = candidates[0];
      const sampleRole = role || sampleCand.role || 'Web Developer Intern';
      const sampleGemma = generateGemmaTask(sampleRole, sampleCand.tasksCompleted || 0);
      const sampleTitle = customTaskName || title || sampleGemma.title;
      const sampleDesc = objective || description || sampleGemma.description;
      const sampleMeet = customMeetLink || 'https://meet.google.com/xyz-sf-briefing';
      const sampleSubUrl = `${APP_URL}/tasks/submit?token=sample_token_${sampleCand.id}`;

      return NextResponse.json({
        success: true,
        preview: {
          subject: customSubject || `Task Assignment & Virtual Explanation Call - ${sampleRole} | Shortfundly`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
            <h3>Task Assignment: ${sampleTitle}</h3>
            <p>Dear ${sampleCand.fullName}, your task [${baseTaskId}] for ${sampleRole} has been scheduled.</p>
            <p><strong>Explanation Call:</strong> ${finalExpDate} at ${finalExpTime}</p>
            <p><strong>Meet Link:</strong> <a href="${sampleMeet}">${sampleMeet}</a></p>
            <p><strong>Deadline:</strong> ${finalDeadline.toLocaleString()}</p>
          </div>`,
          explanationDate: finalExpDate,
          explanationTime: finalExpTime,
          deadline: finalDeadline.toISOString(),
          meetLink: sampleMeet,
          taskTitle: sampleTitle,
          taskDesc: sampleDesc,
          submissionUrl: sampleSubUrl,
          candidate: sampleCand,
        },
      });
    }

    const assignedResults = [];

    // Loop through each candidate and assign task with auto-populated details
    for (const cand of candidates) {
      const candidateRole = cand.role || role || 'Web Developer Intern';
      const gemmaTask = generateGemmaTask(candidateRole, cand.tasksCompleted || 0);
      const taskTitle = customTaskName || title || gemmaTask.title;
      const taskDesc = objective || description || gemmaTask.description;
      const assignedTaskId = `${baseTaskId}-${cand.internId ? cand.internId.slice(-4) : Math.floor(100 + Math.random() * 900)}`;

      // Expiring submission token
      const submissionToken = crypto.randomBytes(24).toString('hex');
      const submissionUrl = `${APP_URL}/tasks/submit?token=${submissionToken}`;

      // Google Meet Link
      let meetLink = customMeetLink;
      if (!meetLink) {
        meetLink = await getOrCreateCandidateMeetLink(cand, finalExpDate);
      }

      // Email subject & body formatting
      const emailSubject = customSubject
        ? customSubject
            .replace(/\{\{candidate_name\}\}/g, cand.fullName)
            .replace(/\{\{candidateName\}\}/g, cand.fullName)
            .replace(/\{\{designation\}\}/g, candidateRole)
            .replace(/\{\{role\}\}/g, candidateRole)
            .replace(/\{\{taskId\}\}/g, assignedTaskId)
            .replace(/\{\{task_title\}\}/g, taskTitle)
        : `Internship Sprint Task Assignment - ${assignedTaskId} | Shortfundly`;

      const rawTemplate = customJinja || customBody;
      const parsedBody = rawTemplate
        ? rawTemplate
            .replace(/\{\{candidate_name\}\}/g, cand.fullName)
            .replace(/\{\{candidateName\}\}/g, cand.fullName)
            .replace(/\{\{email\}\}/g, cand.email)
            .replace(/\{\{internId\}\}/g, cand.internId || cand.candidateId)
            .replace(/\{\{designation\}\}/g, candidateRole)
            .replace(/\{\{role\}\}/g, candidateRole)
            .replace(/\{\{taskId\}\}/g, assignedTaskId)
            .replace(/\{\{task_title\}\}/g, taskTitle)
            .replace(/\{\{taskNumber\}\}/g, String((cand.tasksCompleted || 0) + 1))
            .replace(/\{\{task_content\}\}/g, taskDesc.replace(/\n/g, '<br>'))
            .replace(/\{\{task_description\}\}/g, taskDesc.replace(/\n/g, '<br>'))
            .replace(/\{\{explanationDate\}\}/g, finalExpDate)
            .replace(/\{\{explanation_date\}\}/g, finalExpDate)
            .replace(/\{\{explanationTime\}\}/g, finalExpTime)
            .replace(/\{\{time\}\}/g, finalExpTime)
            .replace(/\{\{meetLink\}\}/g, meetLink)
            .replace(/\{\{meet_link\}\}/g, meetLink)
            .replace(/\{\{submission_link\}\}/g, submissionUrl)
            .replace(/\{\{deadline\}\}/g, finalDeadline.toLocaleString())
        : null;

      const emailHtml = parsedBody
        ? (parsedBody.includes('<') ? parsedBody : `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">${parsedBody.replace(/\n/g, '<br>')}</div>`)
        : `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
            <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #2563eb;">
              <h1 style="color: #60a5fa; margin: 0; font-size: 24px; letter-spacing: 2px;">SHORTFUNDLY</h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Role Milestone Assignment & Virtual Explanation Call</p>
            </div>
            <div style="padding: 28px;">
              <p style="font-size: 16px;">Dear <strong>${cand.fullName}</strong>,</p>
              <p>Your technical milestone task tailored to your role as <strong>${candidateRole}</strong> has been officially assigned:</p>
              
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
                <h3 style="color: #1e293b; margin-top: 0; font-size: 16px;">[${assignedTaskId}] ${taskTitle}</h3>
                <p style="color: #475569; font-size: 13.5px; white-space: pre-line; line-height: 1.6;">${taskDesc}</p>
                ${modules ? `<p style="margin: 8px 0 0 0; font-size: 13px;"><strong>Functional Modules:</strong> ${modules}</p>` : ''}
                ${toolsAndTech ? `<p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Tech Stack:</strong> ${toolsAndTech}</p>` : ''}
              </div>

              <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin: 0 0 8px 0; color: #1d4ed8; font-size: 14px;">Virtual Explanation Call Schedule:</h4>
                <p style="margin: 4px 0;"><strong>Date:</strong> ${finalExpDate}</p>
                <p style="margin: 4px 0;"><strong>Time:</strong> ${finalExpTime}</p>
                <p style="margin: 8px 0 0 0;"><strong>Google Meet Link:</strong> <a href="${meetLink}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${meetLink}</a></p>
              </div>

              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin: 0 0 8px 0; color: #166534; font-size: 14px;">Deliverable Submission:</h4>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Submission Deadline:</strong> ${finalDeadline.toLocaleString()}</p>
                <div style="text-align: center; margin: 16px 0;">
                  <a href="${submissionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px;">Open Submission Portal</a>
                </div>
              </div>

              <p style="margin-top: 24px;">Best regards,<br><strong>Technical Mentorship & HR Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.<br><span style="color: #64748b; font-size: 12px;">Chennai, Tamil Nadu, India | hr@shortfundly.com</span></p>
            </div>
          </div>
        `;

      // Create Task Assignment in DB
      const task = await prisma.taskAssignment.create({
        data: {
          candidateId: cand.id,
          taskNumber: (cand.tasksCompleted || 0) + 1,
          taskId: assignedTaskId,
          taskName: taskTitle,
          title: taskTitle,
          objective: taskDesc,
          modules: modules || null,
          toolsAndTech: toolsAndTech || null,
          clientRequirements: clientRequirements || null,
          description: taskDesc,
          role: candidateRole,
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

      // Generate iCalendar invite
      const icsInvite = createIcsCalendarInvite({
        uid: `sf-task-exp-${task.id}@shortfundly.com`,
        title: `[Shortfundly] Role Sprint Briefing - ${candidateRole} (${cand.fullName})`,
        description: `Task: ${taskTitle}\n\nDeliverables:\n${taskDesc}\n\nJoin Google Meet: ${meetLink}\nSubmission Portal: ${submissionUrl}`,
        meetLink,
        startDateStr: new Date().toISOString().split('T')[0],
        startTimeStr: '11:00',
        durationMinutes: 45,
        attendeeEmail: cand.email,
        attendeeName: cand.fullName,
      });

      // Dispatch Email
      await sendEmail({
        candidateId: cand.id,
        to: cand.email,
        recipientName: cand.fullName,
        cc: cc || undefined,
        subject: emailSubject,
        html: emailHtml,
        text: `Dear ${cand.fullName}, your task [${assignedTaskId}] for ${candidateRole} has been assigned. Explanation date: ${finalExpDate} at ${finalExpTime}. Meet link: ${meetLink}. Submit deliverables before ${finalDeadline.toLocaleString()} at: ${submissionUrl}`,
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

      // Update Candidate status to 'Assigned' and initial performance percentage
      await prisma.candidate.update({
        where: { id: cand.id },
        data: {
          taskStatus: 'Assigned',
          offerLetterStatus: cand.offerLetterStatus === 'Ready to Send' ? 'Sent' : cand.offerLetterStatus,
          performancePercentage: cand.performancePercentage === 100 ? 25.0 : cand.performancePercentage,
        },
      });

      assignedResults.push({
        candidateId: cand.id,
        fullName: cand.fullName,
        taskId: assignedTaskId,
        status: 'Assigned',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Task successfully assigned and dispatched to ${assignedResults.length} candidate(s)!`,
      assignedCount: assignedResults.length,
      assignedResults,
    });
  } catch (error) {
    console.error('Task assignment error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
