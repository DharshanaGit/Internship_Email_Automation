import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderCertificateHtml, generateCertificatePdf } from '@/lib/pdfEngine';

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateId, candidateData, customSubject, customBody, format = 'html' } = body;

    let candidate = candidateData;
    if (candidateId) {
      candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
      });
    }

    if (!candidate && candidateData) {
      candidate = candidateData;
    }

    if (!candidate || (!candidate.fullName && !candidate.candidateName)) {
      return NextResponse.json(
        { success: false, error: 'Candidate information is required for certificate preview.' },
        { status: 400 }
      );
    }

    const normalizedCandidate = {
      ...candidate,
      fullName: candidate.fullName || candidate.candidateName || 'Candidate Name',
      candidateId: candidate.candidateId || candidate.id || 'SF-INT-2026-CERT',
      role: candidate.role || candidate.designation || 'Web Developer Intern',
      department: candidate.department || 'Engineering',
      joiningDate: candidate.joiningDate || '2026-06-01',
      endDate: candidate.endDate || candidate.issueDate || new Date().toISOString().split('T')[0],
      duration: candidate.duration || '3 Months',
    };

    const certNumber = `SF-CERT-2026-${String(normalizedCandidate.candidateId).split('-').pop() || Date.now()}`;
    const issueDate = normalizedCandidate.endDate;

    if (format === 'pdf') {
      const pdfResult = await generateCertificatePdf(normalizedCandidate, certNumber, issueDate);
      return new NextResponse(pdfResult.pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Certificate_${normalizedCandidate.candidateId}.pdf"`,
        },
      });
    }

    const certificateHtml = renderCertificateHtml(normalizedCandidate, certNumber, issueDate);

    const subject =
      customSubject ||
      `Official Internship Completion Certificate - ${normalizedCandidate.fullName} (${certNumber}) | Shortfundly`;

    const emailHtml = customBody
      ? `<div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
          ${customBody.replace(/\n/g, '<br>')}
        </div>`
      : `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
          <div style="background: #0f172a; padding: 28px; text-align: center; border-bottom: 3px solid #3b82f6;">
            <h1 style="color: #60a5fa; margin: 0; font-size: 26px; letter-spacing: 3px;">SHORTFUNDLY</h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 14px;">Official Internship Completion Certificate</p>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px;">Dear <strong>${normalizedCandidate.fullName}</strong>,</p>
            <p>Congratulations on the exemplary completion of your virtual internship with Shortfundly Media Technologies Pvt. Ltd. as <strong>${normalizedCandidate.role}</strong>.</p>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 20px 0;">
              <p style="margin: 3px 0; color: #166534;"><strong>Candidate Name:</strong> ${normalizedCandidate.fullName}</p>
              <p style="margin: 3px 0; color: #166534;"><strong>Role:</strong> ${normalizedCandidate.role}</p>
              <p style="margin: 3px 0; color: #166534;"><strong>Period:</strong> ${normalizedCandidate.joiningDate} to ${normalizedCandidate.endDate}</p>
              <p style="margin: 3px 0; color: #166534;"><strong>Certificate ID:</strong> ${certNumber}</p>
            </div>

            <p>Your official signed certificate has been generated and is attached to this email as a high-resolution PDF document.</p>
            <p>We wish you remarkable success in your academic and professional endeavors!</p>

            <p style="margin-top: 26px;">Warm regards,<br><strong>Selvam</strong><br>Founder & CEO<br>Shortfundly Media Technologies Pvt. Ltd.<br><span style="color: #64748b; font-size: 12px;">Chennai, Tamil Nadu, India | hr@shortfundly.com</span></p>
          </div>
        </div>
      `;

    return NextResponse.json({
      success: true,
      html: certificateHtml,
      certificateId: certNumber,
      subject,
      emailHtml,
      candidate: normalizedCandidate,
    });
  } catch (error) {
    console.error('Certificate generate error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
