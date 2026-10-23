import { prisma } from './prisma';
import { generateOfferLetterPdf, generateCertificatePdf } from './pdfEngine';
import { generateGoogleMeetLink, createIcsCalendarInvite } from './googleCalendar';
import { sendEmail } from './mailer';

// Comprehensive Role-Based Task Definitions & Deliverables
const ROLE_TASK_PRESETS = {
  'Web Developer Intern': {
    title: 'Modern Web Application Architecture & API Integration Sprint',
    description: `Objective:
Build responsive frontend modules and connect them with backend RESTful endpoints following clean architecture standards.

Key Deliverables:
1. Modular frontend components built with Next.js/React and scoped CSS modules.
2. Robust Node.js API route handlers with input validation.
3. Clean GitHub pull request with detailed documentation and unit test coverage.

Tools & Tech Stack: Next.js, React 19, CSS Modules, SQLite, Node.js.
Evaluation Criteria: Code cleanliness, component reusability, responsiveness, zero console errors.`,
  },

  'Digital Marketing Intern': {
    title: 'Growth Marketing, SEO Audit & Multi-Channel Campaign Sprint',
    description: `Objective:
Formulate and execute a data-backed customer acquisition campaign and perform comprehensive organic search optimization.

Key Deliverables:
1. Complete SEO audit covering on-page meta tags, performance bottlenecks, and keyword opportunities.
2. 14-day multi-channel content calendar and ad creative copy for social platforms.
3. Conversion funnel analytics deck detailing traffic sources, CTR, and lead attribution.

Tools & Tech Stack: Google Analytics, SEMrush / Search Console, Canva, Google Sheets.
Evaluation Criteria: Data accuracy, creative engagement potential, strategic alignment with Shortfundly target demographics.`,
  },

  'Data Analytics Intern': {
    title: 'Automated ETL Pipeline, Metrics Modeling & Executive Dashboard Sprint',
    description: `Objective:
Ingest raw operational datasets, build automated data transformation pipelines, and create actionable business intelligence dashboards.

Key Deliverables:
1. Python/SQL data cleaning script handling missing values, anomalies, and schema normalization.
2. Exploratory Data Analysis (EDA) report highlighting candidate engagement and drop-off patterns.
3. Interactive dashboard visualizations tracking KPI progression over time.

Tools & Tech Stack: Python (Pandas/NumPy), SQLite/PostgreSQL, PowerBI / Metabase / Matplotlib.
Evaluation Criteria: Pipeline robustness, statistical rigor, dashboard intuitiveness and presentation clarity.`,
  },

  'UI/UX Design Intern': {
    title: 'End-to-End User Experience Mapping & High-Fidelity Design System Sprint',
    description: `Objective:
Design intuitive user journeys, wireframes, and production-ready high-fidelity Figma components adhering to Web3 aesthetic guidelines.

Key Deliverables:
1. Comprehensive user persona profiles and interaction wireframes.
2. High-fidelity design system tokens (color palettes, typography scale, responsive button variants, forms).
3. Clickable Figma prototype demonstrating key dashboard workflows and micro-interactions.

Tools & Tech Stack: Figma, FigJam, UI Design Tokens, WCAG 2.1 Accessibility Standards.
Evaluation Criteria: Visual hierarchy, accessibility contrast scores, prototype usability and design token consistency.`,
  },

  'Python / AI Intern': {
    title: 'Natural Language Processing & Automated Candidate Parsing Engine Sprint',
    description: `Objective:
Design and implement an intelligent document parsing pipeline to extract candidate qualifications and automate matching logic.

Key Deliverables:
1. Python text extraction module processing PDF and DOCX resumes into structured JSON entities.
2. NLP entity recognition model identifying skills, graduation dates, and degree classifications.
3. Automated test suite validating parser accuracy across varied layout variations.

Tools & Tech Stack: Python 3.11, FastAPI, Spacy / NLTK, PyPDF2, Regex.
Evaluation Criteria: Extraction precision, edge-case fault tolerance, API latency under 200ms.`,
  },

  'Content Writing / Media Intern': {
    title: 'Technical Documentation, Platform Copy & Brand Storytelling Sprint',
    description: `Objective:
Draft high-impact technical product guides, onboarding email sequences, and platform announcement releases for Shortfundly.

Key Deliverables:
1. 3 comprehensive feature overview articles written with clear technical documentation formatting.
2. 5-part email nurture sequence designed for new internship cohorts.
3. Social media teaser copy for new platform release highlights.

Tools & Tech Stack: Markdown, Google Docs, Grammarly, Notion.
Evaluation Criteria: Voice consistency, clarity of instruction, SEO optimization, and grammatical excellence.`,
  },

  'Product Management Intern': {
    title: 'Product Requirement Document (PRD) & Sprint Backlog Prioritization Sprint',
    description: `Objective:
Synthesize user feedback and product telemetry into actionable feature specifications and agile sprint backlogs.

Key Deliverables:
1. Comprehensive Product Requirement Document (PRD) defining core email automation flows.
2. Prioritized Jira/Trello user story backlog with detailed acceptance criteria and edge cases.
3. Competitor benchmark matrix analyzing automated HR workflows.

Tools & Tech Stack: Notion, Jira, Miro, Google Slides.
Evaluation Criteria: Problem-solution alignment, clarity of acceptance criteria, user empathy.`,
  },

  'Software Engineer Intern': {
    title: 'Core Backend Service Architecture & Asynchronous Workflow Sprint',
    description: `Objective:
Architect scalable backend services, optimize database queries, and implement asynchronous event workflows.

Key Deliverables:
1. Production-ready Node.js/Python backend service handling asynchronous background jobs.
2. Normalized database schema migrations with indexing optimizations.
3. Automated integration test suite with CI/CD pipeline configuration.

Tools & Tech Stack: Node.js, SQLite / Prisma, Nodemailer, REST APIs.
Evaluation Criteria: Architecture modularity, query execution times, error handling resilience.`,
  },
};

function getTaskPresetForRole(role) {
  if (!role) return ROLE_TASK_PRESETS['Web Developer Intern'];

  if (ROLE_TASK_PRESETS[role]) {
    return ROLE_TASK_PRESETS[role];
  }

  const roleLower = role.toLowerCase();

  if (roleLower.includes('web') || roleLower.includes('frontend') || roleLower.includes('developer')) {
    return ROLE_TASK_PRESETS['Web Developer Intern'];
  }
  if (roleLower.includes('marketing') || roleLower.includes('growth')) {
    return ROLE_TASK_PRESETS['Digital Marketing Intern'];
  }
  if (roleLower.includes('data') || roleLower.includes('analytics') || roleLower.includes('intelligence')) {
    return ROLE_TASK_PRESETS['Data Analytics Intern'];
  }
  if (roleLower.includes('ui') || roleLower.includes('ux') || roleLower.includes('design')) {
    return ROLE_TASK_PRESETS['UI/UX Design Intern'];
  }
  if (roleLower.includes('python') || roleLower.includes('ai') || roleLower.includes('machine learning')) {
    return ROLE_TASK_PRESETS['Python / AI Intern'];
  }
  if (roleLower.includes('content') || roleLower.includes('writer') || roleLower.includes('media')) {
    return ROLE_TASK_PRESETS['Content Writing / Media Intern'];
  }
  if (roleLower.includes('product') || roleLower.includes('management')) {
    return ROLE_TASK_PRESETS['Product Management Intern'];
  }

  return ROLE_TASK_PRESETS['Software Engineer Intern'];
}

/**
 * 1. Send Offer Letter
 */
async function sendOfferLetter(candidateId) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });
  if (!candidate) throw new Error('Candidate not found');

  const pdfResult = await generateOfferLetterPdf(candidate);
  const pdfFilename = pdfResult.filename || `Shortfundly_Offer_Letter_${candidate.candidateId}.pdf`;

  const emailHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
      <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #2563eb;">
        <h1 style="color: #60a5fa; margin: 0; font-size: 24px; letter-spacing: 2px;">SHORTFUNDLY</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Shortfundly Media Technologies Pvt. Ltd.</p>
      </div>
      <div style="padding: 28px;">
        <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
        <p>Congratulations! We are delighted to formally offer you an internship position as <strong>${candidate.role}</strong> in our <strong>${candidate.department}</strong> department.</p>
        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 3px 0;"><strong>Role:</strong> ${candidate.role}</p>
          <p style="margin: 3px 0;"><strong>Department:</strong> ${candidate.department}</p>
          <p style="margin: 3px 0;"><strong>Tenure:</strong> ${candidate.joiningDate} to ${candidate.endDate} (${candidate.duration})</p>
          <p style="margin: 3px 0;"><strong>Work Mode:</strong> ${candidate.workMode}</p>
        </div>
        <p>Please review your attached official Offer Letter PDF. Sign and return an accepted copy within 3 business days to confirm your onboarding.</p>
        <p style="margin-top: 24px;">Warm regards,<br><strong>Human Resources Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.<br><span style="color: #64748b; font-size: 12px;">Chennai, Tamil Nadu, India | hr@shortfundly.com</span></p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    candidateId: candidate.id,
    to: candidate.email,
    recipientName: candidate.fullName,
    subject: `Internship Offer Letter - ${candidate.fullName} (${candidate.candidateId}) | Shortfundly`,
    html: emailHtml,
    emailType: 'OFFER_LETTER',
    attachments: [
      {
        filename: pdfFilename,
        content: pdfResult.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  await prisma.candidate.update({
    where: { id: candidate.id },
    data: { offerLetterStatus: 'Sent' },
  });

  return { success: true, emailResult: result };
}

/**
 * 2. Assign Task & Send Task Document with Explanation Call (Google Meet + Calendar Invite)
 */
async function assignTaskAndSendDocument({
  candidateId,
  title,
  description,
  explanationDate,
  explanationTime = '14:00',
  customMeetLink = null,
}) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });
  if (!candidate) throw new Error('Candidate not found');

  const preset = getTaskPresetForRole(candidate.role);
  const taskTitle = title || `${candidate.role} - ${preset.title}`;
  const taskDesc = description || preset.description;
  const meetLink = customMeetLink || generateGoogleMeetLink();

  // Review Date is automatically 2 days after explanation date
  const expDateObj = new Date(explanationDate);
  const reviewDateObj = new Date(expDateObj.getTime() + 2 * 24 * 60 * 60 * 1000);
  const reviewDateStr = reviewDateObj.toISOString().split('T')[0];
  const reviewTimeStr = explanationTime;

  // Create Task Assignment record in DB
  const task = await prisma.taskAssignment.create({
    data: {
      candidateId: candidate.id,
      title: taskTitle,
      description: taskDesc,
      role: candidate.role,
      explanationDate: explanationDate,
      explanationTime: explanationTime,
      meetLink: meetLink,
      reviewDate: reviewDateStr,
      reviewTime: reviewTimeStr,
      status: 'Assigned',
      reviewCount: 0,
    },
  });

  // Generate iCalendar (.ics) invite for the explanation call
  const icsInvite = createIcsCalendarInvite({
    uid: `sf-task-exp-${task.id}@shortfundly.com`,
    title: `[Shortfundly] Role Sprint Briefing - ${candidate.role} (${candidate.fullName})`,
    description: `Task: ${taskTitle}\n\nDeliverables:\n${taskDesc}\n\nJoin with Google Meet: ${meetLink}`,
    meetLink: meetLink,
    startDateStr: explanationDate,
    startTimeStr: explanationTime,
    durationMinutes: 45,
    attendeeEmail: candidate.email,
    attendeeName: candidate.fullName,
  });

  const emailHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
      <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #2563eb;">
        <h1 style="color: #60a5fa; margin: 0; font-size: 24px; letter-spacing: 2px;">SHORTFUNDLY</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Role Milestone Assignment & Virtual Explanation Call</p>
      </div>
      <div style="padding: 28px;">
        <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
        <p>Your milestone task tailored to your role as <strong>${candidate.role}</strong> in <strong>${candidate.department}</strong> has been officially assigned:</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <h3 style="color: #1e293b; margin-top: 0; font-size: 16px;">${taskTitle}</h3>
          <p style="color: #475569; font-size: 13.5px; white-space: pre-line; line-height: 1.6;">${taskDesc}</p>
        </div>

        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0; color: #1d4ed8; font-size: 14px;">Virtual Explanation Call Schedule:</h4>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${explanationDate}</p>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${explanationTime} IST</p>
          <p style="margin: 8px 0 0 0;"><strong>Google Meet Link:</strong> <a href="${meetLink}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${meetLink}</a></p>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 12.5px; color: #166534;">
          <strong>Timeline Note:</strong> Your mentor review session will take place exactly 2 days after this call on <strong>${reviewDateStr}</strong> via the same Google Meet link.
        </div>

        <p style="font-size: 13px; color: #64748b;">
          A Google Calendar invite (.ics) is attached to this email. You can directly RSVP and add this session to your calendar with 1-click.
        </p>
        
        <p style="margin-top: 24px;">Best regards,<br><strong>Technical Mentorship & HR Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    candidateId: candidate.id,
    to: candidate.email,
    recipientName: candidate.fullName,
    subject: `Task Assignment & Explanation Call - ${candidate.role} | Shortfundly`,
    html: emailHtml,
    emailType: 'TASK_ASSIGNMENT',
    meetLink: meetLink,
    icalEvent: icsInvite,
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

  return { success: true, task, emailResult: result };
}

/**
 * 3. Send Next Review Email (sent on explanation date, review scheduled 2 days later)
 */
async function sendNextReviewEmail(taskId) {
  const task = await prisma.taskAssignment.findUnique({
    where: { id: taskId },
    include: { candidate: true },
  });
  if (!task) throw new Error('Task not found');

  const { candidate } = task;

  const icsInvite = createIcsCalendarInvite({
    uid: `sf-task-review-${task.id}@shortfundly.com`,
    title: `[Shortfundly] Milestone Review Call - ${candidate.fullName}`,
    description: `Milestone review for task: ${task.title}.\n\nJoin Google Meet: ${task.meetLink}`,
    meetLink: task.meetLink,
    startDateStr: task.reviewDate,
    startTimeStr: task.reviewTime,
    durationMinutes: 45,
    attendeeEmail: candidate.email,
    attendeeName: candidate.fullName,
  });

  const emailHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
      <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #2563eb;">
        <h1 style="color: #60a5fa; margin: 0; font-size: 24px; letter-spacing: 2px;">SHORTFUNDLY</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Internship Milestone Review Notification</p>
      </div>
      <div style="padding: 28px;">
        <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
        <p>Following our task briefing, your milestone review has been officially scheduled for 2 days from today:</p>
        
        <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Task:</strong> ${task.title}</p>
          <p style="margin: 4px 0;"><strong>Review Date:</strong> ${task.reviewDate}</p>
          <p style="margin: 4px 0;"><strong>Review Time:</strong> ${task.reviewTime} IST</p>
          <p style="margin: 8px 0 0 0;"><strong>Google Meet:</strong> <a href="${task.meetLink}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${task.meetLink}</a></p>
        </div>

        <p>Please be ready to present your deliverables, demo code, or progress report during this review session. We look forward to evaluating your progress.</p>
        
        <p style="margin-top: 24px;">Best regards,<br><strong>Assigned Mentor: ${candidate.assignedMentor}</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    candidateId: candidate.id,
    to: candidate.email,
    recipientName: candidate.fullName,
    subject: `Scheduled Milestone Review Call - ${candidate.fullName} | Shortfundly`,
    html: emailHtml,
    emailType: 'REVIEW_SCHEDULED',
    meetLink: task.meetLink,
    icalEvent: icsInvite,
    attachments: [
      {
        filename: 'review_invite.ics',
        content: icsInvite,
        contentType: 'text/calendar; charset=utf-8; method=REQUEST',
      },
    ],
  });

  await prisma.taskAssignment.update({
    where: { id: task.id },
    data: {
      status: 'Review Pending',
      reviewCount: { increment: 1 },
    },
  });

  await prisma.candidate.update({
    where: { id: candidate.id },
    data: { taskStatus: 'Under Review' },
  });

  return { success: true, emailResult: result };
}

/**
 * 4. Review Feedback & Next Iteration (Until Task Completion)
 */
async function sendReviewFeedback({
  taskId,
  feedback,
  isTaskComplete = false,
  nextReviewDate = null,
  nextReviewTime = '15:00',
}) {
  const task = await prisma.taskAssignment.findUnique({
    where: { id: taskId },
    include: { candidate: true },
  });
  if (!task) throw new Error('Task not found');

  const { candidate } = task;

  if (isTaskComplete) {
    try {
      const { recordTaskCompletion } = await import('./excelTaskUpdater');
      await recordTaskCompletion(candidate.id, feedback);
    } catch (e) {
      console.error('Error updating excel in recordTaskCompletion:', e);
    }

    await prisma.taskAssignment.update({
      where: { id: task.id },
      data: {
        status: 'Completed',
        feedback: feedback,
      },
    });

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { taskStatus: 'Completed' },
    });

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
        <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #10b981;">
          <h1 style="color: #34d399; margin: 0; font-size: 24px; letter-spacing: 2px;">TASK COMPLETED</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Shortfundly Media Technologies Pvt. Ltd.</p>
        </div>
        <div style="padding: 28px;">
          <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
          <p>Congratulations! Your assigned task <strong>${task.title}</strong> has been reviewed and accepted as <strong>COMPLETED</strong>.</p>
          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin: 0 0 6px 0; color: #047857;">Mentor Feedback:</h4>
            <p style="margin: 0; color: #065f46; white-space: pre-line;">${feedback || 'Excellent execution and satisfactory milestone delivery.'}</p>
          </div>
          <p>Your official Shortfundly Internship Completion Certificate is now ready for generation.</p>
          <p style="margin-top: 24px;">Warm regards,<br><strong>Mentor: ${candidate.assignedMentor}</strong><br>Shortfundly Media Technologies</p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      candidateId: candidate.id,
      to: candidate.email,
      recipientName: candidate.fullName,
      subject: `Task Completed & Approved - ${candidate.fullName} | Shortfundly`,
      html: emailHtml,
      emailType: 'REVIEW_FEEDBACK',
    });

    return { success: true, completed: true, emailResult: result };
  } else {
    const nextDate = nextReviewDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    await prisma.taskAssignment.update({
      where: { id: task.id },
      data: {
        status: 'Review Pending',
        feedback: feedback,
        reviewDate: nextDate,
        reviewTime: nextReviewTime,
        reviewCount: { increment: 1 },
      },
    });

    const icsInvite = createIcsCalendarInvite({
      uid: `sf-review-iter-${task.id}-${Date.now()}@shortfundly.com`,
      title: `[Shortfundly] Follow-Up Review - ${candidate.fullName}`,
      description: `Follow-up review with feedback.\n\nFeedback:\n${feedback}\n\nJoin Google Meet: ${task.meetLink}`,
      meetLink: task.meetLink,
      startDateStr: nextDate,
      startTimeStr: nextReviewTime,
      durationMinutes: 45,
      attendeeEmail: candidate.email,
      attendeeName: candidate.fullName,
    });

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
        <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #f59e0b;">
          <h1 style="color: #fbbf24; margin: 0; font-size: 24px; letter-spacing: 2px;">REVIEW FEEDBACK & NEXT CALL</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Shortfundly Media Technologies Pvt. Ltd.</p>
        </div>
        <div style="padding: 28px;">
          <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
          <p>Your recent submission for <strong>${task.title}</strong> has been reviewed. Please review your mentor's feedback and prepare the requested updates:</p>
          
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin: 0 0 6px 0; color: #b45309;">Mentor Feedback & Required Changes:</h4>
            <p style="margin: 0; color: #92400e; white-space: pre-line;">${feedback}</p>
          </div>

          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin: 0 0 6px 0; color: #1d4ed8;">Next Follow-Up Review Call:</h4>
            <p style="margin: 4px 0;"><strong>Date:</strong> ${nextDate}</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${nextReviewTime} IST</p>
            <p style="margin: 8px 0 0 0;"><strong>Google Meet:</strong> <a href="${task.meetLink}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${task.meetLink}</a></p>
          </div>

          <p style="margin-top: 24px;">Best regards,<br><strong>Mentor: ${candidate.assignedMentor}</strong><br>Shortfundly Media Technologies</p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      candidateId: candidate.id,
      to: candidate.email,
      recipientName: candidate.fullName,
      subject: `Review Feedback & Follow-Up Session - ${candidate.fullName} | Shortfundly`,
      html: emailHtml,
      emailType: 'REVIEW_FEEDBACK',
      meetLink: task.meetLink,
      icalEvent: icsInvite,
      attachments: [
        {
          filename: 'next_review_invite.ics',
          content: icsInvite,
          contentType: 'text/calendar; charset=utf-8; method=REQUEST',
        },
      ],
    });

    return { success: true, completed: false, emailResult: result };
  }
}

/**
 * 5. Generate and Send Completion Certificate
 */
async function sendCompletionCertificate(candidateId) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });
  if (!candidate) throw new Error('Candidate not found');

  const certNumber = `SF-CERT-2026-${candidate.candidateId.split('-').pop() || Date.now()}`;
  const issueDate = candidate.endDate || new Date().toISOString().split('T')[0];

  const pdfBuffer = await generateCertificatePdf(candidate, certNumber, issueDate);
  const pdfFilename = `Shortfundly_Internship_Certificate_${candidate.candidateId}.pdf`;

  await prisma.certificate.upsert({
    where: { certificateNumber: certNumber },
    update: { sentAt: new Date() },
    create: {
      candidateId: candidate.id,
      certificateNumber: certNumber,
      issueDate: issueDate,
      sentAt: new Date(),
    },
  });

  const emailHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
      <div style="background: #0f172a; padding: 28px; text-align: center; border-bottom: 3px solid #3b82f6;">
        <h1 style="color: #60a5fa; margin: 0; font-size: 26px; letter-spacing: 3px;">SHORTFUNDLY</h1>
        <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 14px;">Official Internship Completion Certificate</p>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
        <p>Congratulations on the exemplary completion of your virtual internship with Shortfundly Media Technologies Pvt. Ltd. as <strong>${candidate.role}</strong>.</p>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <p style="margin: 3px 0; color: #166534;"><strong>Candidate Name:</strong> ${candidate.fullName}</p>
          <p style="margin: 3px 0; color: #166534;"><strong>Role:</strong> ${candidate.role}</p>
          <p style="margin: 3px 0; color: #166534;"><strong>Period:</strong> ${candidate.joiningDate} to ${candidate.endDate}</p>
          <p style="margin: 3px 0; color: #166534;"><strong>Certificate ID:</strong> ${certNumber}</p>
        </div>

        <p>Your official signed certificate has been generated and is attached to this email as a high-resolution PDF document.</p>
        <p>We wish you remarkable success in your academic and professional endeavors!</p>

        <p style="margin-top: 26px;">Warm regards,<br><strong>Selvam</strong><br>Founder & CEO<br>Shortfundly Media Technologies Pvt. Ltd.<br><span style="color: #64748b; font-size: 12px;">Chennai, Tamil Nadu, India | hr@shortfundly.com</span></p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    candidateId: candidate.id,
    to: candidate.email,
    recipientName: candidate.fullName,
    subject: `Official Internship Completion Certificate - ${candidate.fullName} (${certNumber}) | Shortfundly`,
    html: emailHtml,
    emailType: 'COMPLETION_CERTIFICATE',
    attachments: [
      {
        filename: pdfFilename,
        content: pdfResult.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  return { success: true, certificateNumber: certNumber, emailResult: result };
}

export {
  sendOfferLetter,
  assignTaskAndSendDocument,
  sendNextReviewEmail,
  sendReviewFeedback,
  sendCompletionCertificate,
  getTaskPresetForRole,
  ROLE_TASK_PRESETS,
};
