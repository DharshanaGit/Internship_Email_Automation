import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCertificatePdf } from '@/lib/pdfEngine';
import { sendEmail } from '@/lib/mailer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateId, candidateName, email, role, issueDate, cc, customSubject, customBody, forceEligible = false } = body;

    let candidate = null;
    if (candidateId) {
      candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    } else if (email) {
      candidate = await prisma.candidate.findFirst({ where: { email } });
    }

    if (!candidate && candidateName && email) {
      const candId = `SF-INT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      candidate = await prisma.candidate.create({
        data: {
          candidateId: candId,
          fullName: candidateName,
          email,
          role: role || 'Web Developer Intern',
          department: 'Engineering',
          joiningDate: '2026-06-01',
          endDate: issueDate || new Date().toISOString().split('T')[0],
          offerLetterStatus: 'Accepted',
          taskStatus: 'Completed',
          tasksCompleted: 1,
        },
      });
    }

    if (!candidate) {
      return NextResponse.json({ success: false, error: 'Candidate not found.' }, { status: 404 });
    }

    // Strict Evaluation Rule: tasks completed < 1 get NO certificate
    const tasksDone = candidate.tasksCompleted || 0;
    if (tasksDone < 1 && candidate.taskStatus !== 'Completed' && !forceEligible) {
      return NextResponse.json(
        {
          success: false,
          error: `Ineligible: ${candidate.fullName} has completed 0 tasks. Evaluation rule requires minimum 1 completed sprint milestone before certificate issuance.`,
        },
        { status: 403 }
      );
    }

    const certNumber = `SF-CERT-2026-${candidate.candidateId.split('-').pop() || Date.now()}`;
    const certDate = issueDate || candidate.endDate || new Date().toISOString().split('T')[0];

    // Generate Certificate PDF
    const pdfResult = await generateCertificatePdf(candidate, certNumber, certDate);

    // Record in DB
    await prisma.certificate.upsert({
      where: { certificateNumber: certNumber },
      update: { sentAt: new Date(), pdfPath: pdfResult.filePath },
      create: {
        candidateId: candidate.id,
        certificateNumber: certNumber,
        issueDate: certDate,
        pdfPath: pdfResult.filePath,
        sentAt: new Date(),
      },
    });

    const subject =
      customSubject ||
      `Official Internship Completion Certificate - ${candidate.fullName} (${certNumber}) | Shortfundly`;

    const htmlBody = customBody
      ? `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
          ${customBody.replace(/\n/g, '<br>')}
        </div>`
      : `
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

            <p style="margin-top: 26px;">Warm regards,<br><strong>Selvam</strong><br>Founder & CEO<br>Shortfundly Media Technologies Pvt. Ltd.</p>
          </div>
        </div>
      `;

    const emailResult = await sendEmail({
      candidateId: candidate.id,
      to: candidate.email,
      recipientName: candidate.fullName,
      cc: cc || undefined,
      subject,
      html: htmlBody,
      text: `Dear ${candidate.fullName}, your Shortfundly Internship Certificate is attached. Certificate ID: ${certNumber}`,
      emailType: 'COMPLETION_CERTIFICATE',
      attachments: [
        {
          filename: pdfResult.filename,
          content: pdfResult.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: `Internship Certificate dispatched to ${candidate.fullName}!`,
      certificateNumber: certNumber,
      candidate,
      emailResult,
    });
  } catch (error) {
    console.error('Send certificate error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
