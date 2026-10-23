import crypto from 'crypto';
import { prisma } from './prisma';
import { generateOfferLetterPdf } from './pdfEngine';
import { sendEmail } from './mailer';
import { generateGemmaTask } from './gemmaEngine';
import { generateGoogleMeetLink, createIcsCalendarInvite } from './googleCalendar';
import { createRealMeetLink, getOrCreateCandidateMeetLink } from './googleMeet';
import { addDays, formatToDdMmYy, getRandomIstTime } from './dateUtils';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

let isProcessing = false;
let workerInterval = null;

/**
 * Enqueue bulk offer letters
 */
export async function enqueueBulkOfferLetters(candidates, options = {}) {
  const records = [];
  for (const c of candidates) {
    // Generate a secure unique acceptance token for each candidate
    const token = crypto.randomBytes(24).toString('hex');
    await prisma.candidate.update({
      where: { id: c.id },
      data: { offerAcceptanceToken: token },
    });

    const payload = JSON.stringify({
      candidateId: c.id,
      fullName: c.fullName,
      email: c.email,
      role: c.role,
      department: c.department,
      joiningDate: c.joiningDate,
      endDate: c.endDate,
      workMode: c.workMode,
      token,
      cc: options.cc || null,
      customSubject: options.customSubject || null,
      customBody: options.customBody || null,
    });

    records.push({
      type: 'OFFER_LETTER',
      candidateId: c.id,
      payload,
      status: 'PENDING',
    });
  }

  const result = await prisma.emailQueue.createMany({
    data: records,
  });

  // Ensure worker is running
  startQueueWorker();
  return result;
}

/**
 * Enqueue bulk task assignments
 */
export async function enqueueBulkTasks(candidates, options = {}) {
  const records = candidates.map((c) => {
    const payload = JSON.stringify({
      candidateId: c.id,
      fullName: c.fullName,
      email: c.email,
      role: c.role,
      department: c.department,
      customTitle: options.customTitle || null,
      customDescription: options.customDescription || null,
      explanationDate: options.explanationDate || null,
      explanationTime: options.explanationTime || null,
      cc: options.cc || null,
    });

    return {
      type: 'TASK_ASSIGNMENT',
      candidateId: c.id,
      payload,
      status: 'PENDING',
    };
  });

  const result = await prisma.emailQueue.createMany({
    data: records,
  });

  startQueueWorker();
  return result;
}

/**
 * Pull and process exactly 1 item from SQLite email_queue
 */
export async function processNextQueueItem() {
  if (isProcessing) return null;
  isProcessing = true;

  try {
    // Find oldest pending queue job
    const item = await prisma.emailQueue.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    if (!item) {
      isProcessing = false;
      return null;
    }

    // Mark as PROCESSING
    await prisma.emailQueue.update({
      where: { id: item.id },
      data: { status: 'PROCESSING', processedAt: new Date() },
    });

    const payload = JSON.parse(item.payload);
    const candidate = await prisma.candidate.findUnique({
      where: { id: item.candidateId || payload.candidateId },
    });

    if (!candidate) {
      throw new Error(`Candidate ${item.candidateId || payload.candidateId} not found in database.`);
    }

    if (item.type === 'OFFER_LETTER') {
      // 1. Generate Offer Letter PDF
      const pdfResult = await generateOfferLetterPdf(candidate);

      // 2. Acceptance link URL
      const token = payload.token || candidate.offerAcceptanceToken || crypto.randomBytes(24).toString('hex');
      const acceptUrl = `${APP_URL}/api/offers/accept?token=${token}`;

      // 3. Personalized email body
      const subject = payload.customSubject
        ? payload.customSubject
            .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
            .replace(/\{\{candidate_id\}\}/g, candidate.candidateId)
            .replace(/\{\{internship_role\}\}/g, candidate.role)
        : `Internship Offer Letter - ${candidate.fullName} (${candidate.candidateId}) | Shortfundly`;

      const parsedCustomOfferBody = payload.customBody
        ? payload.customBody
            .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
            .replace(/\{\{candidate_id\}\}/g, candidate.candidateId)
            .replace(/\{\{internship_role\}\}/g, candidate.role)
            .replace(/\{\{designation\}\}/g, candidate.role)
            .replace(/\{\{department\}\}/g, candidate.department)
            .replace(/\{\{joining_date\}\}/g, candidate.joiningDate)
            .replace(/\{\{end_date\}\}/g, candidate.endDate)
            .replace(/\{\{duration\}\}/g, candidate.duration || '3 Months')
            .replace(/\{\{work_mode\}\}/g, candidate.workMode || 'Online - Remote')
            .replace(/\{\{stipend\}\}/g, candidate.stipend || 'Rs. 10,000')
            .replace(/\{\{degree\}\}/g, candidate.degree || 'Bachelor of Engineering')
            .replace(/\{\{college_name\}\}/g, candidate.collegeName || 'Recognized University')
            .replace(/\{\{phone\}\}/g, candidate.phone || '')
        : null;

      const htmlBody = parsedCustomOfferBody
        ? (parsedCustomOfferBody.includes('<') ? parsedCustomOfferBody : `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">${parsedCustomOfferBody.replace(/\n/g, '<br>')}</div>`)
        : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #090d16, #1e293b); padding: 28px 24px; text-align: center; border-bottom: 3px solid #38bdf8;">
            <h1 style="color: #38bdf8; margin: 0; font-size: 24px; letter-spacing: 2px;">SHORTFUNDLY</h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">Shortfundly Media Technologies Pvt. Ltd. • Internship Automation</p>
          </div>
          <div style="padding: 32px 28px;">
            <p style="font-size: 16px; margin-top: 0;">Dear <strong>${candidate.fullName}</strong>,</p>
            <p>Congratulations! We are delighted to formally offer you an internship position as <strong>${candidate.role}</strong> in our <strong>${candidate.department}</strong> department.</p>
            
            <div style="background: #f1f5f9; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 24px 0; border-radius: 6px;">
              <p style="margin: 4px 0;"><strong>Role:</strong> ${candidate.role}</p>
              <p style="margin: 4px 0;"><strong>Department:</strong> ${candidate.department}</p>
              <p style="margin: 4px 0;"><strong>Tenure:</strong> ${candidate.joiningDate} to ${candidate.endDate} (${candidate.duration})</p>
              <p style="margin: 4px 0;"><strong>Work Mode:</strong> ${candidate.workMode}</p>
            </div>

            <p>Please find attached your official Shortfundly Internship Offer Letter PDF. Kindly review the attached offer letter and reach out to our HR team if you have any questions.</p>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
            <p style="margin: 0; font-size: 13px; color: #475569;">Warm regards,<br><strong style="color: #0f172a;">Human Resources Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.<br><span style="color: #94a3b8; font-size: 12px;">Chennai, Tamil Nadu, India | hr@shortfundly.com</span></p>
          </div>
        </div>
      `;

      // 4. Dispatch Email
      await sendEmail({
        candidateId: candidate.id,
        to: candidate.email,
        recipientName: candidate.fullName,
        cc: payload.cc || undefined,
        subject,
        html: htmlBody,
        text: `Dear ${candidate.fullName}, your official Shortfundly Internship Offer Letter is attached. Please review the attached document.`,
        emailType: 'OFFER_LETTER',
        attachments: [
          {
            filename: pdfResult.filename,
            content: pdfResult.pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      // 5. Update Candidate
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          offerLetterStatus: 'Sent',
          offerAcceptanceToken: token,
        },
      });

      // Mark COMPLETED
      await prisma.emailQueue.update({
        where: { id: item.id },
        data: { status: 'COMPLETED', error: null },
      });
    } else if (item.type === 'TASK_ASSIGNMENT') {
      // Role task generation via Gemma 2B
      const gemmaTask = generateGemmaTask(candidate.role, candidate.tasksCompleted || 0);
      const title = payload.customTitle || gemmaTask.title;
      const description = payload.customDescription || gemmaTask.description;

      // Explanation call: 2 days after task assignment
      const explDateObj = addDays(new Date(), 2);
      const explanationDate = payload.explanationDate || formatToDdMmYy(explDateObj);
      const explanationTime = payload.explanationTime || getRandomIstTime();

      // Review 1: 2 days after explanation call
      const revDateObj = addDays(explDateObj, 2);
      const reviewDate = formatToDdMmYy(revDateObj);
      const reviewTime = getRandomIstTime();

      // Backend checks Database: Does candidate have a google_meet_url?
      // NO  --> Calls Google Calendar API (conferenceDataVersion: 1), stores in candidates.google_meet_url
      // YES --> Reuses existing stored link
      const meetLink = await getOrCreateCandidateMeetLink(candidate, explanationDate);

      // Create TaskAssignment in SQLite
      const assignment = await prisma.taskAssignment.create({
        data: {
          candidateId: candidate.id,
          taskNumber: (candidate.tasksCompleted || 0) + 1,
          title,
          description,
          role: candidate.role,
          explanationDate,
          explanationTime,
          meetLink,
          reviewDate,
          reviewTime,
          status: 'Assigned',
        },
      });

      // Create .ics Calendar invitation
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
        description: `Project Task Explanation Call for ${candidate.role}.\nMeeting link: ${meetLink}\nTask: ${title}`,
        meetLink,
        startDateStr: fullDateStr,
        startTimeStr,
        attendeeEmail: candidate.email,
        attendeeName: candidate.fullName,
      });

      const subject = payload.customSubject
        ? payload.customSubject
            .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
            .replace(/\{\{designation\}\}/g, candidate.role)
            .replace(/\{\{task_title\}\}/g, title)
        : `Internship Task Assignment: ${title} - ${candidate.fullName} | Shortfundly`;

      const parsedCustomTaskBody = payload.customBody
        ? payload.customBody
            .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
            .replace(/\{\{email\}\}/g, candidate.email)
            .replace(/\{\{designation\}\}/g, candidate.role)
            .replace(/\{\{task_title\}\}/g, title)
            .replace(/\{\{task_content\}\}/g, description)
            .replace(/\{\{explanation_date\}\}/g, explanationDate)
            .replace(/\{\{time\}\}/g, explanationTime)
            .replace(/\{\{meet_link\}\}/g, meetLink)
        : null;

      const htmlBody = parsedCustomTaskBody
        ? (parsedCustomTaskBody.includes('<') ? parsedCustomTaskBody : `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">${parsedCustomTaskBody.replace(/\n/g, '<br>')}</div>`)
        : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #090d16, #1e293b); padding: 26px 24px; text-align: center; border-bottom: 3px solid #38bdf8;">
            <h1 style="color: #38bdf8; margin: 0; font-size: 22px; letter-spacing: 1.5px;">SHORTFUNDLY TASK ASSIGNMENT</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Role: ${candidate.role} • Sprint Deliverables</p>
          </div>
          <div style="padding: 28px 24px;">
            <p style="font-size: 15px;">Dear <strong>${candidate.fullName}</strong>,</p>
            <p>Your technical assignment for the <strong>${candidate.role}</strong> internship has been synthesized by our AI curriculum engine.</p>
            
            <div style="background: #0f172a; color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #334155;">
              <h3 style="color: #38bdf8; margin-top: 0; font-size: 17px;">${title}</h3>
              <p style="white-space: pre-wrap; font-size: 13px; line-height: 1.6; color: #cbd5e1; margin-bottom: 0;">${description}</p>
            </div>

            <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 6px;">
              <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 15px;">Onboarding Schedule & Explanation Call</h4>
              <p style="margin: 3px 0;"><strong>Date:</strong> ${explanationDate} (2 days after task assignment)</p>
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
        cc: payload.cc || undefined,
        subject,
        html: htmlBody,
        text: `Task Assignment: ${title}. Explanation call scheduled on ${explanationDate} at ${explanationTime}. Google Meet: ${meetLink}`,
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

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { taskStatus: 'Assigned' },
      });

      await prisma.emailQueue.update({
        where: { id: item.id },
        data: { status: 'COMPLETED', error: null },
      });
    }

    isProcessing = false;
    return item;
  } catch (err) {
    console.error('[Queue Worker Item Error]', err);
    if (isProcessing) {
      // Find currently processing item and increment attempts or mark FAILED
      try {
        const failedItem = await prisma.emailQueue.findFirst({
          where: { status: 'PROCESSING' },
          orderBy: { updatedAt: 'desc' },
        });
        if (failedItem) {
          const attempts = failedItem.attempts + 1;
          await prisma.emailQueue.update({
            where: { id: failedItem.id },
            data: {
              attempts,
              status: attempts >= 3 ? 'FAILED' : 'PENDING',
              error: err.message,
            },
          });
        }
      } catch (innerErr) {
        console.error('[Queue Error Recording Failed]', innerErr);
      }
      isProcessing = false;
    }
    return null;
  }
}

/**
 * Starts worker loop that pulls 1 email every 2–3 seconds (2500ms)
 */
export function startQueueWorker() {
  if (workerInterval) return;
  console.log('[Queue Worker] Starting background worker loop (1 item every 2.5s)...');
  workerInterval = setInterval(async () => {
    try {
      await processNextQueueItem();
    } catch (e) {
      console.error('[Worker Tick Exception]', e);
    }
  }, 2500);
}

/**
 * Real-time queue statistics
 */
export async function getQueueStats() {
  const [pending, processing, completed, failed, total] = await Promise.all([
    prisma.emailQueue.count({ where: { status: 'PENDING' } }),
    prisma.emailQueue.count({ where: { status: 'PROCESSING' } }),
    prisma.emailQueue.count({ where: { status: 'COMPLETED' } }),
    prisma.emailQueue.count({ where: { status: 'FAILED' } }),
    prisma.emailQueue.count(),
  ]);

  return { pending, processing, completed, failed, total };
}
