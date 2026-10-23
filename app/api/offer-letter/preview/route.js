import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderOfferLetterHtml } from '@/lib/pdfEngine';

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateId, candidateData, customSubject, customBody } = body;

    let candidate = candidateData;
    if (candidateId) {
      candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
      });
    }

    if (!candidate || (!candidate.fullName && !candidate.candidateName)) {
      return NextResponse.json(
        { success: false, error: 'Candidate information is required for preview.' },
        { status: 400 }
      );
    }

    // Normalize field names
    const normalizedCandidate = {
      ...candidate,
      fullName: candidate.fullName || candidate.candidateName || 'Candidate Name',
      candidateId: candidate.candidateId || candidate.id || 'SF-INT-2026-PREVIEW',
      email: candidate.email || 'candidate@example.com',
      role: candidate.role || candidate.designation || 'Web Developer Intern',
      department: candidate.department || 'Engineering',
      joiningDate: candidate.joiningDate || '2026-06-01',
      endDate: candidate.endDate || '2026-08-31',
      duration: candidate.duration || '3 Months',
      workMode: candidate.workMode || 'Online - Remote',
      reportingManager: candidate.reportingManager || 'Priyanka Nair',
      assignedMentor: candidate.assignedMentor || 'Rahul Kapoor',
      collegeName: candidate.collegeName || 'Recognized University',
      degree: candidate.degree || 'Bachelor of Technology',
      phone: candidate.phone || '+91 9876543210',
      stipend: candidate.stipend || 'Rs. 10,000',
    };

    // Render A4 printable Offer Letter HTML
    const letterHtml = renderOfferLetterHtml(normalizedCandidate);

    // Render personalized email subject
    const subject = customSubject
      ? customSubject
          .replace(/\{\{candidate_name\}\}/g, normalizedCandidate.fullName)
          .replace(/\{\{candidate_id\}\}/g, normalizedCandidate.candidateId)
          .replace(/\{\{internship_role\}\}/g, normalizedCandidate.role)
          .replace(/\{\{department\}\}/g, normalizedCandidate.department)
          .replace(/\{\{joining_date\}\}/g, normalizedCandidate.joiningDate)
      : `Internship Offer Letter - ${normalizedCandidate.fullName} (${normalizedCandidate.candidateId}) | Shortfundly`;

    // Render email body HTML
    const parsedPreviewCustom = customBody
      ? customBody
          .replace(/\{\{candidate_name\}\}/g, normalizedCandidate.fullName)
          .replace(/\{\{candidate_id\}\}/g, normalizedCandidate.candidateId)
          .replace(/\{\{internship_role\}\}/g, normalizedCandidate.role)
          .replace(/\{\{designation\}\}/g, normalizedCandidate.role)
          .replace(/\{\{department\}\}/g, normalizedCandidate.department)
          .replace(/\{\{joining_date\}\}/g, normalizedCandidate.joiningDate)
          .replace(/\{\{end_date\}\}/g, normalizedCandidate.endDate)
          .replace(/\{\{duration\}\}/g, normalizedCandidate.duration || '3 Months')
          .replace(/\{\{work_mode\}\}/g, normalizedCandidate.workMode || 'Online - Remote')
          .replace(/\{\{stipend\}\}/g, normalizedCandidate.stipend || 'Rs. 10,000')
          .replace(/\{\{degree\}\}/g, normalizedCandidate.degree || 'Bachelor of Technology')
          .replace(/\{\{college_name\}\}/g, normalizedCandidate.collegeName || 'Recognized University')
          .replace(/\{\{phone\}\}/g, normalizedCandidate.phone || '')
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
              <p style="margin: 3px 0;"><strong>Department:</strong> ${normalizedCandidate.department}</p>
              <p style="margin: 3px 0;"><strong>Tenure:</strong> ${normalizedCandidate.joiningDate} to ${normalizedCandidate.endDate} (${normalizedCandidate.duration})</p>
              <p style="margin: 3px 0;"><strong>Stipend:</strong> ${normalizedCandidate.stipend}</p>
              <p style="margin: 3px 0;"><strong>Work Mode:</strong> ${normalizedCandidate.workMode}</p>
            </div>
            <p>Please find attached your official Shortfundly Internship Offer Letter PDF. Kindly review the attached offer letter and reach out to our HR team if you have any questions.</p>
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
