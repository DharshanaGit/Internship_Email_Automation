import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateGemmaTask } from '@/lib/gemmaEngine';
import { generateGoogleMeetLink, createIcsCalendarInvite } from '@/lib/googleCalendar';
import { createRealMeetLink, getOrCreateCandidateMeetLink } from '@/lib/googleMeet';
import { addDays, formatToDdMmYy, getRandomIstTime } from '@/lib/dateUtils';
import { sendEmail } from '@/lib/mailer';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return renderHtmlResponse({
        success: false,
        title: 'Invalid Acceptance Request',
        message: 'No verification token was provided in this acceptance URL.',
      });
    }

    const candidate = await prisma.candidate.findFirst({
      where: { offerAcceptanceToken: token },
      include: { tasks: true },
    });

    if (!candidate) {
      return renderHtmlResponse({
        success: false,
        title: 'Offer Not Found',
        message: 'The token provided is invalid or has expired. Please contact Shortfundly HR at hr@shortfundly.com.',
      });
    }

    // Check if already accepted
    if (candidate.offerLetterStatus === 'ACCEPTED') {
      const existingTask = candidate.tasks && candidate.tasks.length > 0 ? candidate.tasks[0] : null;
      return renderHtmlResponse({
        success: true,
        title: 'Offer Already Accepted',
        candidateName: candidate.fullName,
        role: candidate.role,
        message: `You formally accepted your offer on ${new Date(candidate.offerAcceptedAt || candidate.updatedAt).toLocaleDateString('en-IN')}. Your onboarding schedule and task deliverables are active.`,
        taskDetails: existingTask
          ? {
              title: existingTask.title,
              explanationDate: existingTask.explanationDate,
              explanationTime: existingTask.explanationTime,
              meetLink: existingTask.meetLink,
            }
          : null,
      });
    }

    // 1. Update Candidate Status to ACCEPTED in SQLite
    const now = new Date();
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        offerLetterStatus: 'ACCEPTED',
        offerAcceptedAt: now,
        taskStatus: 'Assigned',
      },
    });

    // 2. Automatically prompt Gemma 2B for the role-specific task
    const gemmaTask = generateGemmaTask(candidate.role, 0);

    // Explanation call = 2 days after task assignment
    const explDateObj = addDays(now, 2);
    const explanationDate = formatToDdMmYy(explDateObj);
    const explanationTime = getRandomIstTime();

    // Review 1 = 2 days after explanation call
    const rev1DateObj = addDays(explDateObj, 2);
    const reviewDate = formatToDdMmYy(rev1DateObj);
    const reviewTime = getRandomIstTime();

    // Genuine Google Meet link via Google Calendar API or stored candidate room
    const meetLink = await getOrCreateCandidateMeetLink(candidate, explanationDate);

    // 3. Create TaskAssignment in SQLite
    const taskAssignment = await prisma.taskAssignment.create({
      data: {
        candidateId: candidate.id,
        taskNumber: 1,
        title: gemmaTask.title,
        description: gemmaTask.description,
        role: candidate.role,
        explanationDate,
        explanationTime,
        meetLink,
        reviewDate,
        reviewTime,
        status: 'Assigned',
        reviewCount: 0,
      },
    });

    // 4. Generate RFC-5545 iCalendar invite (.ics)
    const [day, month, shortYear] = explanationDate.split('.');
    const year = 2000 + parseInt(shortYear || '26', 10);
    const fullDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timeMatch = explanationTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    let hour = 11;
    let minute = 0;
    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      minute = parseInt(timeMatch[2], 10);
      if (timeMatch[3].toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (timeMatch[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
    }
    const startTimeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    const icsBuffer = createIcsCalendarInvite({
      title: `Shortfundly Task Briefing & Explanation Call - ${candidate.fullName}`,
      description: `Project Task Briefing for ${candidate.role}.\nMeeting link: ${meetLink}\nTask: ${gemmaTask.title}`,
      meetLink,
      startDateStr: fullDateStr,
      startTimeStr,
      attendeeEmail: candidate.email,
      attendeeName: candidate.fullName,
    });

    // 5. Automatically dispatch task email + .ics without admin intervention
    const taskEmailSubject = `Internship Task Assignment: ${gemmaTask.title} - ${candidate.fullName} | Shortfundly`;
    const taskEmailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #090d16, #1e293b); padding: 26px 24px; text-align: center; border-bottom: 3px solid #38bdf8;">
          <h1 style="color: #38bdf8; margin: 0; font-size: 22px; letter-spacing: 1.5px;">SHORTFUNDLY TASK ASSIGNMENT</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Role: ${candidate.role} • Automatic AI Sprint Synthesis</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="font-size: 15px;">Dear <strong>${candidate.fullName}</strong>,</p>
          <p>Thank you for formally accepting your offer! Your technical sprint for the <strong>${candidate.role}</strong> position has been automatically generated by our AI engine.</p>
          
          <div style="background: #0f172a; color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #334155;">
            <h3 style="color: #38bdf8; margin-top: 0; font-size: 17px;">${gemmaTask.title}</h3>
            <p style="white-space: pre-wrap; font-size: 13px; line-height: 1.6; color: #cbd5e1; margin-bottom: 0;">${gemmaTask.description}</p>
          </div>

          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 15px;">Onboarding Schedule & Explanation Call</h4>
            <p style="margin: 3px 0;"><strong>Date:</strong> ${explanationDate} (2 days after acceptance)</p>
            <p style="margin: 3px 0;"><strong>Time Slot:</strong> ${explanationTime}</p>
            <p style="margin: 3px 0;"><strong>Google Meet Link:</strong> <a href="${meetLink}" style="color: #2563eb; font-weight: bold;">${meetLink}</a></p>
            <p style="margin: 3px 0; font-size: 12px; color: #64748b;">A synchronized Google Calendar invitation (.ics) is attached to this email.</p>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin: 0 0 6px 0; color: #334155; font-size: 14px;">Review 1 Milestone</h4>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Scheduled Review 1:</strong> ${reviewDate} at ${reviewTime}</p>
          </div>

          <p style="font-size: 13px; color: #64748b;">Warm regards,<br><strong style="color: #0f172a;">Engineering & Mentorship Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
        </div>
      </div>
    `;

    await sendEmail({
      candidateId: candidate.id,
      to: candidate.email,
      recipientName: candidate.fullName,
      subject: taskEmailSubject,
      html: taskEmailHtml,
      text: `Welcome to Shortfundly! Task: ${gemmaTask.title}. Explanation call on ${explanationDate} at ${explanationTime}. Google Meet: ${meetLink}`,
      emailType: 'TASK_ASSIGNMENT',
      meetLink,
      attachments: [
        {
          filename: `Shortfundly_Explanation_Call_${candidate.candidateId}.ics`,
          content: icsBuffer,
          contentType: 'text/calendar; charset=utf-8; method=REQUEST',
        },
      ],
    });

    return renderHtmlResponse({
      success: true,
      title: 'Offer Accepted & Task Dispatched!',
      candidateName: candidate.fullName,
      role: candidate.role,
      message: 'Your internship offer has been recorded as ACCEPTED. Your customized technical sprint has been synthesized by Gemma 2B and sent to your email along with your Google Meet onboarding schedule.',
      taskDetails: {
        title: gemmaTask.title,
        explanationDate,
        explanationTime,
        meetLink,
        reviewDate,
        reviewTime,
      },
    });
  } catch (error) {
    console.error('[Offer Accept Error]', error);
    return renderHtmlResponse({
      success: false,
      title: 'Processing Error',
      message: `An unexpected error occurred: ${error.message}`,
    });
  }
}

function renderHtmlResponse({ success, title, candidateName, role, message, taskDetails }) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} | Shortfundly Automation</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #070b14;
          color: #f8fafc;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .container {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 16px;
          max-width: 620px;
          width: 100%;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        }
        .header {
          background: linear-gradient(135deg, #090d16 0%, #1e293b 100%);
          padding: 32px 28px;
          text-align: center;
          border-bottom: 2px solid ${success ? '#38bdf8' : '#f43f5e'};
        }
        .badge {
          display: inline-block;
          padding: 4px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 12px;
          background: ${success ? 'rgba(56, 189, 248, 0.15)' : 'rgba(244, 63, 94, 0.15)'};
          color: ${success ? '#38bdf8' : '#f43f5e'};
          border: 1px solid ${success ? 'rgba(56, 189, 248, 0.3)' : 'rgba(244, 63, 94, 0.3)'};
        }
        h1 {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 6px;
        }
        .subtitle {
          color: #94a3b8;
          font-size: 14px;
        }
        .content {
          padding: 32px 28px;
        }
        .greeting {
          font-size: 17px;
          color: #e2e8f0;
          margin-bottom: 14px;
        }
        .message {
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .card-title {
          color: #38bdf8;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .card-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(51, 65, 85, 0.5);
          font-size: 13px;
        }
        .card-row:last-child {
          border-bottom: none;
        }
        .card-label {
          color: #94a3b8;
        }
        .card-value {
          color: #f8fafc;
          font-weight: 600;
        }
        .meet-link {
          color: #38bdf8;
          text-decoration: none;
          word-break: break-all;
        }
        .footer {
          text-align: center;
          padding: 20px 28px;
          background: #090d16;
          border-top: 1px solid #1e293b;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <span class="badge">${success ? 'SUCCESSFUL VERIFICATION' : 'NOTIFICATION'}</span>
          <h1>${title}</h1>
          <p class="subtitle">Shortfundly Media Technologies Pvt. Ltd.</p>
        </div>
        <div class="content">
          ${candidateName ? `<p class="greeting">Hello, <strong>${candidateName}</strong> (${role})</p>` : ''}
          <p class="message">${message}</p>

          ${
            taskDetails
              ? `
            <div class="card">
              <div class="card-title">${taskDetails.title}</div>
              <div class="card-row">
                <span class="card-label">Explanation Call Date:</span>
                <span class="card-value">${taskDetails.explanationDate}</span>
              </div>
              <div class="card-row">
                <span class="card-label">IST Time Window:</span>
                <span class="card-value">${taskDetails.explanationTime}</span>
              </div>
              <div class="card-row">
                <span class="card-label">Google Meet Link:</span>
                <span class="card-value"><a class="meet-link" href="${taskDetails.meetLink}" target="_blank">${taskDetails.meetLink}</a></span>
              </div>
              ${
                taskDetails.reviewDate
                  ? `
                <div class="card-row">
                  <span class="card-label">Review 1 Milestone:</span>
                  <span class="card-value">${taskDetails.reviewDate} at ${taskDetails.reviewTime}</span>
                </div>
              `
                  : ''
              }
            </div>
          `
              : ''
          }
        </div>
        <div class="footer">
          Shortfundly Internship Operations Deck • Automated Pipeline
        </div>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
