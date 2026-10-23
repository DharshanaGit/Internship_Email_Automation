import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateGemmaTask } from '@/lib/gemmaEngine';
import { getExplanationSchedule, getReviewOneSchedule } from '@/lib/dateUtils';
import { generateGoogleMeetLink, createIcsCalendarInvite } from '@/lib/googleCalendar';
import { createRealMeetLink, getOrCreateCandidateMeetLink } from '@/lib/googleMeet';
import { sendEmail } from '@/lib/mailer';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      candidateId,
      candidateName,
      email,
      role,
      title,
      description,
      explanationDate,
      explanationTime,
      customMeetLink,
      customSubject,
      customBody,
      cc,
      previewOnly = false,
    } = body;

    // 1. Resolve candidate
    let candidate = null;
    if (candidateId) {
      candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    } else if (email) {
      candidate = await prisma.candidate.findFirst({
        where: { email: { equals: email } },
      });
    }

    if (!candidate && candidateName && email) {
      // Find or create candidate
      const candId = `SF-INT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      candidate = await prisma.candidate.create({
        data: {
          candidateId: candId,
          fullName: candidateName,
          email,
          role: role || 'Web Developer Intern',
          department: 'Engineering',
          joiningDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          offerLetterStatus: 'Sent', // Assigned directly by admin
          taskStatus: 'Not Assigned',
        },
      });
    }

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: 'Candidate not found or details incomplete (Name, Email, Designation required).' },
        { status: 400 }
      );
    }

    // If offer letter status was not yet updated, auto-update to 'Sent' so assignment proceeds seamlessly
    if (candidate.offerLetterStatus !== 'Sent' && candidate.offerLetterStatus !== 'Accepted') {
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { offerLetterStatus: 'Sent' },
      });
      candidate.offerLetterStatus = 'Sent';
    }

    // 2. Generate task content based on Designation / Role
    const candidateRole = role || candidate.role || 'Web Developer Intern';
    const gemmaTask = generateGemmaTask(candidateRole, candidate.tasksCompleted || 0);
    const taskTitle = title || gemmaTask.title;
    const taskDesc = description || gemmaTask.description;

    // 3. Schedule: Explanation call date 2 days after task mail sent, IST time (9 AM - 7 PM)
    const expSchedule = getExplanationSchedule(new Date());
    const finalExpDate = explanationDate || expSchedule.dateStr;
    const finalExpTime = explanationTime || expSchedule.timeStr;
    const rev1Schedule = getReviewOneSchedule(finalExpDate);

    // 4. Backend checks Database: Does candidate have a google_meet_url?
    //    NO  --> Calls Google Calendar API (conferenceDataVersion: 1), creates Meet room, stores in candidates.google_meet_url
    //    YES --> Reuses existing stored link
    let meetLink = customMeetLink;
    if (!meetLink) {
      meetLink = await getOrCreateCandidateMeetLink(candidate, finalExpDate);
    }

    // 5. Template replacement
    const emailSubject = customSubject
      ? customSubject
          .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
          .replace(/\{\{designation\}\}/g, candidateRole)
          .replace(/\{\{task_title\}\}/g, taskTitle)
      : `Task Assignment & Virtual Explanation Call - ${candidateRole} | Shortfundly`;

    const emailHtml = customBody
      ? `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
          ${customBody
            .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
            .replace(/\{\{email\}\}/g, candidate.email)
            .replace(/\{\{designation\}\}/g, candidateRole)
            .replace(/\{\{task_title\}\}/g, taskTitle)
            .replace(/\{\{task_content\}\}/g, taskDesc.replace(/\n/g, '<br>'))
            .replace(/\{\{explanation_date\}\}/g, finalExpDate)
            .replace(/\{\{time\}\}/g, finalExpTime)
            .replace(/\{\{meet_link\}\}/g, meetLink)
            .replace(/\n/g, '<br>')}
        </div>`
      : `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #2563eb;">
            <h1 style="color: #60a5fa; margin: 0; font-size: 24px; letter-spacing: 2px;">SHORTFUNDLY</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Role Milestone Assignment & Virtual Explanation Call</p>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
            <p>Your milestone task tailored to your designation as <strong>${candidateRole}</strong> has been assigned:</p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
              <h3 style="color: #1e293b; margin-top: 0; font-size: 16px;">${taskTitle}</h3>
              <p style="color: #475569; font-size: 13.5px; white-space: pre-line; line-height: 1.6;">${taskDesc}</p>
            </div>

            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
              <h4 style="margin: 0 0 8px 0; color: #1d4ed8; font-size: 14px;">Virtual Explanation Call Schedule:</h4>
              <p style="margin: 4px 0;"><strong>Explanation Date:</strong> ${finalExpDate}</p>
              <p style="margin: 4px 0;"><strong>Time:</strong> ${finalExpTime}</p>
              <p style="margin: 8px 0 0 0;"><strong>Joining Google Meet Link:</strong> <a href="${meetLink}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${meetLink}</a></p>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 12.5px; color: #166534;">
              <strong>Review Schedule:</strong> Your milestone review will take place 2 days after the explanation call on <strong>${rev1Schedule.callDateStr}</strong> via the same Google Meet link.
            </div>

            <p style="margin-top: 24px;">Best regards,<br><strong>Technical Mentorship & HR Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
          </div>
        </div>
      `;

    // If only preview requested
    if (previewOnly) {
      return NextResponse.json({
        success: true,
        preview: {
          subject: emailSubject,
          html: emailHtml,
          explanationDate: finalExpDate,
          explanationTime: finalExpTime,
          meetLink,
          taskTitle,
          taskDesc,
          candidate,
        },
      });
    }

    // 6. Save Task Assignment in DB
    const task = await prisma.taskAssignment.create({
      data: {
        candidateId: candidate.id,
        taskNumber: (candidate.tasksCompleted || 0) + 1,
        title: taskTitle,
        description: taskDesc,
        role: candidateRole,
        explanationDate: finalExpDate,
        explanationTime: finalExpTime,
        meetLink,
        reviewDate: rev1Schedule.callDateStr,
        reviewTime: rev1Schedule.timeStr,
        status: 'Assigned',
        reviewCount: 0,
      },
    });

    // 7. Generate iCalendar invite
    const icsInvite = createIcsCalendarInvite({
      uid: `sf-task-exp-${task.id}@shortfundly.com`,
      title: `[Shortfundly] Role Sprint Briefing - ${candidateRole} (${candidate.fullName})`,
      description: `Task: ${taskTitle}\n\nDeliverables:\n${taskDesc}\n\nJoin Google Meet: ${meetLink}`,
      meetLink,
      startDateStr: new Date().toISOString().split('T')[0],
      startTimeStr: '11:00',
      durationMinutes: 45,
      attendeeEmail: candidate.email,
      attendeeName: candidate.fullName,
    });

    // 8. Dispatch Email
    const emailResult = await sendEmail({
      candidateId: candidate.id,
      to: candidate.email,
      recipientName: candidate.fullName,
      cc: cc || undefined,
      subject: emailSubject,
      html: emailHtml,
      text: `Dear ${candidate.fullName}, your task for ${candidateRole} has been assigned. Explanation date: ${finalExpDate} at ${finalExpTime}. Meet: ${meetLink}`,
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

    // 9. Update Candidate status
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { taskStatus: 'In Progress' },
    });

    return NextResponse.json({
      success: true,
      message: `Task successfully assigned to ${candidate.fullName}!`,
      task,
      emailResult,
    });
  } catch (error) {
    console.error('Task assignment error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
