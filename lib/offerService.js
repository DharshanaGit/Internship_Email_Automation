import crypto from 'crypto';
import { prisma } from './prisma.js';
import { generateOfferLetterPdf, corporateOfferTemplateSource } from './pdfEngine.js';
import { sendEmail } from './mailer.js';
import { renderJinja, jinjaTextToEmailHtml } from './jinjaEngine.js';
import { generateGemmaInternId, generateGemmaToken } from './gemmaService.js';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3001';

export const DEFAULT_OFFER_EMAIL_SUBJECT = 'Official Internship Offer from Shortfundly - {{candidateName}}';

export const DEFAULT_OFFER_EMAIL_BODY_JINJA = `Dear {{candidateName}},

Congratulations! We are thrilled to offer you the position of {{role}} at Shortfundly. We were deeply impressed by your skills, background, and performance throughout our evaluation process.

Internship Details:
• Role / Position: {{role}}
• Intern ID: {{internId}}
• Anticipated Start Date: {{startDate}}
• Duration: {{duration}}
• Stipend / Compensation: {{stipend}}
• Work Location / Mode: Online

Action Required: Review & Respond
To review the full formal offer letter PDF attached to this email and record your response, please access your secure candidate portal via the unique link below:

👉 Access Your Secure Offer Portal & Sign Offer:
{{responseLink}}

Important Note on Expiration: This unique link and offer will officially expire on {{deadline}}. Please ensure you complete your response before this deadline.

How to Confirm Acceptance:
1. Click the secure link above to open your candidate portal.
2. Review the terms outlined in the formal offer letter.
3. Provide your digital signature directly on the platform.
4. Upload a photo of your signature (or signature document/ID as required) to officially confirm your acceptance of this offer.

If you have any questions or require clarifications regarding the terms, please feel free to reach out to us by replying directly to this email.

We are excited about the prospect of having you join the Shortfundly family and look forward to building amazing things together!

Best regards,
Hiring & Talent Acquisition Team
Shortfundly
www.shortfundly.com`;

export const DEFAULT_OFFER_EMAIL_BODY = DEFAULT_OFFER_EMAIL_BODY_JINJA;

/**
 * Generate a next unique sequential Intern ID, e.g. INT-2026-00001
 */
export async function generateUniqueInternId(year = new Date().getFullYear()) {
  const prefix = `INT-${year}-`;
  const latestCandidate = await prisma.candidate.findFirst({
    where: {
      internId: {
        startsWith: prefix,
      },
    },
    orderBy: {
      internId: 'desc',
    },
    select: { internId: true },
  });

  let nextSequence = 1;
  if (latestCandidate?.internId) {
    const parts = latestCandidate.internId.split('-');
    const currentNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(currentNum)) {
      nextSequence = currentNum + 1;
    }
  }

  const paddedNum = String(nextSequence).padStart(5, '0');
  return `${prefix}${paddedNum}`;
}

/**
 * Generates crypto token and SHA-256 hash for secure expiring offer links
 */
export function generateSecureResponseToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

/**
 * Compiles and interpolates email body & subject with candidate details
 */
export function buildOfferEmailContent({ candidate, template, customSubject, customBody, deadlineStr, responseLink }) {
  const deadline = deadlineStr || (candidate.offerDeadline ? new Date(candidate.offerDeadline).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Within 3 days');

  const context = {
    candidateName: candidate.fullName,
    candidate_name: candidate.fullName,
    role: candidate.role,
    internship_role: candidate.role,
    startDate: candidate.joiningDate,
    joining_date: candidate.joiningDate,
    endDate: candidate.endDate,
    end_date: candidate.endDate,
    duration: candidate.duration || '3 Months',
    internship_duration: candidate.duration || '3 Months',
    stipend: candidate.stipend || 'Rs. 10,000',
    workMode: candidate.workMode || 'Online - Remote',
    reportingManager: candidate.reportingManager || 'Priyanka Nair',
    assignedMentor: candidate.assignedMentor || 'Rahul Kapoor',
    candidateId: candidate.candidateId,
    candidate_id: candidate.candidateId,
    internId: candidate.internId || candidate.candidateId,
    intern_id: candidate.internId || candidate.candidateId,
    collegeName: candidate.collegeName || '',
    college_name: candidate.collegeName || '',
    degree: candidate.degree || '',
    deadline: deadline,
    responseLink: responseLink,
    responseUrl: responseLink,
    response_url: responseLink,
  };

  const subjectTemplate = customSubject || template?.subject || DEFAULT_OFFER_EMAIL_SUBJECT;
  const bodyTemplate = customBody || template?.emailBody || DEFAULT_OFFER_EMAIL_BODY;

  const subjectCompiled = renderJinja(subjectTemplate, context);
  const rawBodyCompiled = renderJinja(bodyTemplate, context);

  // If raw body does not have html tags, convert Jinja plain text to rich HTML
  const hasHtml = /<[a-z][\s\S]*>/i.test(rawBodyCompiled);
  const finalHtml = hasHtml ? rawBodyCompiled : jinjaTextToEmailHtml(rawBodyCompiled, context);

  return {
    subject: subjectCompiled,
    text: rawBodyCompiled,
    html: finalHtml,
    deadline,
  };
}
