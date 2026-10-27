import crypto from 'crypto';
import handlebars from 'handlebars';
import { prisma } from './prisma.js';
import { generateOfferLetterPdf, corporateOfferTemplateSource } from './pdfEngine.js';
import { sendEmail } from './mailer.js';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3001';

export const DEFAULT_OFFER_EMAIL_SUBJECT = 'Official Internship Offer from Shortfundly - {{candidateName}}';

export const DEFAULT_OFFER_EMAIL_BODY = `
<div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 640px; margin: 0 auto; line-height: 1.6; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #09090b 0%, #1e1136 50%, #2e1065 100%); padding: 30px 24px; text-align: center; border-bottom: 3px solid #a855f7;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px;">SHORTFUNDLY</h1>
    <p style="color: #c084fc; margin: 6px 0 0 0; font-size: 13px;">Automated Talent Acquisition & Onboarding System</p>
  </div>
  <div style="padding: 32px 28px;">
    <p style="font-size: 16px; margin-top: 0;">Dear <strong>{{candidateName}}</strong>,</p>
    <p>Congratulations! We are thrilled to offer you the position of <strong>{{role}}</strong> at <strong>Shortfundly</strong>. We were deeply impressed by your skills, background, and performance throughout our evaluation process.</p>
    
    <div style="background: #0f0d18; border-left: 4px solid #a855f7; padding: 18px 22px; margin: 24px 0; border-radius: 6px; color: #f5f3ff;">
      <h3 style="margin-top: 0; margin-bottom: 12px; color: #c084fc; font-size: 15px;">Internship Details:</h3>
      <p style="margin: 4px 0;">• <strong>Role / Position:</strong> {{role}}</p>
      <p style="margin: 4px 0;">• <strong>Anticipated Start Date:</strong> {{startDate}}</p>
      <p style="margin: 4px 0;">• <strong>Duration:</strong> {{duration}}</p>
      <p style="margin: 4px 0;">• <strong>Stipend / Compensation:</strong> {{stipend}}</p>
      <p style="margin: 4px 0;">• <strong>Work Location / Mode:</strong> Online</p>
    </div>

    <h3 style="color: #0f172a; margin-top: 24px;">Action Required: Review & Respond</h3>
    <p>To review the full formal offer letter PDF attached to this email and record your response, please access your secure candidate portal via the unique link below:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{responseLink}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 14px rgba(147, 51, 234, 0.35);">
        👉 Access Your Secure Offer Portal & Sign Offer
      </a>
    </div>

    <p style="font-size: 13.5px; background: #faf5ff; border: 1px dashed #d8b4fe; padding: 12px 16px; border-radius: 6px; color: #581c87;">
      <strong>Important Note on Expiration:</strong> This unique link and offer will officially expire on <strong>{{deadline}}</strong>. Please ensure you complete your response before this deadline.
    </p>

    <h4 style="color: #1e293b; margin-top: 22px; margin-bottom: 8px;">How to Confirm Acceptance:</h4>
    <ol style="padding-left: 20px; color: #334155;">
      <li style="margin-bottom: 6px;">Click the secure link above to open your candidate portal.</li>
      <li style="margin-bottom: 6px;">Review the terms outlined in the formal offer letter.</li>
      <li style="margin-bottom: 6px;">Provide your digital signature directly on the platform.</li>
      <li style="margin-bottom: 6px;">Upload a photo of your signature (or signature document/ID as required) to officially confirm your acceptance of this offer.</li>
    </ol>

    <p style="margin-top: 20px; font-size: 13.5px; color: #475569;">
      If you have any questions or require clarifications regarding the terms, please feel free to reach out to us by replying directly to this email.
    </p>

    <p style="margin-top: 20px; font-size: 14px; color: #334155;">
      We are excited about the prospect of having you join the Shortfundly family and look forward to building amazing things together!
    </p>

    <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
    
    <p style="margin: 0; font-size: 13.5px; color: #475569;">
      Best regards,<br>
      <strong style="color: #0f172a;">Hiring & Talent Acquisition Team</strong><br>
      Shortfundly<br>
      <a href="https://www.shortfundly.com" style="color: #7c3aed; text-decoration: none;">www.shortfundly.com</a>
    </p>
  </div>
</div>
`;

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
    collegeName: candidate.collegeName || '',
    degree: candidate.degree || '',
    deadline: deadline,
    responseLink: responseLink,
  };

  const subjectTemplate = customSubject || template?.subject || DEFAULT_OFFER_EMAIL_SUBJECT;
  const bodyTemplate = customBody || template?.emailBody || DEFAULT_OFFER_EMAIL_BODY;

  const subjectCompiled = handlebars.compile(subjectTemplate)(context);
  const bodyCompiled = handlebars.compile(bodyTemplate)(context);

  return {
    subject: subjectCompiled,
    html: bodyCompiled,
    deadline,
  };
}
