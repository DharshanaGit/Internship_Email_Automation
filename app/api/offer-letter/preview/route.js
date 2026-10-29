export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderOfferLetterHtml } from '@/lib/pdfEngine';

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateId, candidateData, customSubject, customBody, customPdfTemplate } = body;

    let candidate = candidateData || {};
    if (candidateId) {
      try {
        if (prisma && prisma.candidate) {
          const found = await prisma.candidate.findFirst({
            where: {
              OR: [
                { id: candidateId },
                { candidateId: candidateId },
              ],
            },
          });
          if (found) {
            candidate = { ...found, ...candidate };
          }
        }
      } catch (dbErr) {
        console.warn('Preview candidate lookup fallback:', dbErr.message);
      }
    }

    // Normalize field names with sensible fallbacks
    const normalizedCandidate = {
      ...candidate,
      fullName: candidate.fullName || candidate.candidateName || 'Aarav Sharma',
      candidateId: candidate.candidateId || candidate.id || 'SF-INT-2026-0001',
      internId: candidate.internId || candidate.candidateId || 'INT-2026-00001',
      email: candidate.email || 'aarav.sharma@example.com',
      role: candidate.role || candidate.designation || 'AI Engineer Intern',
      department: candidate.department || 'Engineering',
      batch: candidate.batch || 'Batch A',
      joiningDate: candidate.joiningDate || '2026-11-02',
      endDate: candidate.endDate || '2026-12-02',
      duration: candidate.duration || '1 Month',
      workMode: candidate.workMode || 'Online - Remote',
      reportingManager: candidate.reportingManager || 'Priyanka Nair',
      assignedMentor: candidate.assignedMentor || 'Rahul Kapoor',
      collegeName: candidate.collegeName || 'Recognized University',
      degree: candidate.degree || 'Bachelor of Science / Technology',
      phone: candidate.phone || '+91 9000000001',
      stipend: candidate.stipend || 'Rs. 20,000',
    };

    // Render A4 printable Offer Letter HTML (supports custom template if provided)
    let letterHtml = '';
    try {
      letterHtml = renderOfferLetterHtml(normalizedCandidate, customPdfTemplate);
    } catch (renderErr) {
      console.warn('PDF template render fallback:', renderErr.message);
      letterHtml = renderOfferLetterHtml(normalizedCandidate);
    }

    // Render personalized email subject
    const subject = customSubject
      ? customSubject
          .replace(/\{\{\s*candidate_name\s*\}\}/gi, normalizedCandidate.fullName)
          .replace(/\{\{\s*candidate_id\s*\}\}/gi, normalizedCandidate.candidateId)
          .replace(/\{\{\s*intern_id\s*\}\}/gi, normalizedCandidate.internId)
          .replace(/\{\{\s*internship_role\s*\}\}/gi, normalizedCandidate.role)
          .replace(/\{\{\s*designation\s*\}\}/gi, normalizedCandidate.role)
          .replace(/\{\{\s*department\s*\}\}/gi, normalizedCandidate.department)
          .replace(/\{\{\s*joining_date\s*\}\}/gi, normalizedCandidate.joiningDate)
      : `Internship Offer Letter - ${normalizedCandidate.fullName} (${normalizedCandidate.candidateId}) | Shortfundly`;

    // Render email body HTML
    const dummyResponseUrl = `https://internship-email-automation.vercel.app/offers/respond?token=preview-token-sample`;
    const parsedPreviewCustom = customBody
      ? customBody
          .replace(/\{\{\s*candidate_name\s*\}\}/gi, normalizedCandidate.fullName)
          .replace(/\{\{\s*candidate_id\s*\}\}/gi, normalizedCandidate.candidateId)
          .replace(/\{\{\s*intern_id\s*\}\}/gi, normalizedCandidate.internId)
          .replace(/\{\{\s*internship_role\s*\}\}/gi, normalizedCandidate.role)
          .replace(/\{\{\s*role\s*\}\}/gi, normalizedCandidate.role)
          .replace(/\{\{\s*designation\s*\}\}/gi, normalizedCandidate.role)
          .replace(/\{\{\s*department\s*\}\}/gi, normalizedCandidate.department)
          .replace(/\{\{\s*joining_date\s*\}\}/gi, normalizedCandidate.joiningDate)
          .replace(/\{\{\s*start_date\s*\}\}/gi, normalizedCandidate.joiningDate)
          .replace(/\{\{\s*end_date\s*\}\}/gi, normalizedCandidate.endDate)
          .replace(/\{\{\s*duration\s*\}\}/gi, normalizedCandidate.duration || '1 Month')
          .replace(/\{\{\s*work_mode\s*\}\}/gi, normalizedCandidate.workMode || 'Online - Remote')
          .replace(/\{\{\s*stipend\s*\}\}/gi, normalizedCandidate.stipend || 'Rs. 20,000')
          .replace(/\{\{\s*degree\s*\}\}/gi, normalizedCandidate.degree || 'Bachelor of Science / Technology')
          .replace(/\{\{\s*college_name\s*\}\}/gi, normalizedCandidate.collegeName || 'Recognized University')
          .replace(/\{\{\s*phone\s*\}\}/gi, normalizedCandidate.phone || '')
          .replace(/\{\{\s*deadline\s*\}\}/gi, 'Within 3 days of receipt')
          .replace(/\{\{\s*response_url\s*\}\}/gi, dummyResponseUrl)
          .replace(/\{\{\s*response_link\s*\}\}/gi, dummyResponseUrl)
      : null;

    const emailBodyHtml = parsedPreviewCustom
      ? (parsedPreviewCustom.includes('<') ? parsedPreviewCustom : `<div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">${parsedPreviewCustom.replace(/\n/g, '<br>')}</div>`)
      : `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
          <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #2563eb;">
            <h1 style="color: #60a5fa; margin: 0; font-size: 24px; letter-spacing: 2px;">SHORTFUNDLY</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Shortfundly Media Technologies Pvt. Ltd.</p>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 16px;">Dear <strong>${normalizedCandidate.fullName}</strong>,</p>
            <p>Congratulations! We are delighted to formally offer you an internship position as <strong>${normalizedCandidate.role}</strong> in our <strong>${normalizedCandidate.department}</strong> department.</p>
            <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 3px 0;"><strong>Role:</strong> ${normalizedCandidate.role}</p>
              <p style="margin: 3px 0;"><strong>Intern ID:</strong> ${normalizedCandidate.internId}</p>
              <p style="margin: 3px 0;"><strong>Batch:</strong> ${normalizedCandidate.batch}</p>
              <p style="margin: 3px 0;"><strong>Department:</strong> ${normalizedCandidate.department}</p>
              <p style="margin: 3px 0;"><strong>Tenure:</strong> ${normalizedCandidate.joiningDate} to ${normalizedCandidate.endDate} (${normalizedCandidate.duration})</p>
              <p style="margin: 3px 0;"><strong>Monthly Stipend:</strong> ${normalizedCandidate.stipend}</p>
              <p style="margin: 3px 0;"><strong>Work Mode:</strong> ${normalizedCandidate.workMode}</p>
            </div>
            <p>Please review and sign your acceptance via your unique candidate portal link below:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${dummyResponseUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Review & Sign Offer Letter</a>
            </div>
            <p>Please find attached your official Shortfundly Internship Offer Letter PDF.</p>
            <p style="margin-top: 24px;">Warm regards,<br><strong>Human Resources Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.<br><span style="color: #64748b; font-size: 12px;">Chennai, Tamil Nadu, India | hr@shortfundly.com</span></p>
          </div>
        </div>
      `;

    return NextResponse.json({
      success: true,
      candidate: normalizedCandidate,
      subject,
      emailBodyHtml,
      letterHtml,
    });
  } catch (error) {
    console.error('Offer letter preview error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to generate preview' }, { status: 500 });
  }
}
