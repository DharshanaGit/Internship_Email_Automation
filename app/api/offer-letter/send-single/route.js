import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { generateOfferLetterPdf } from '@/lib/pdfEngine';
import { sendEmail } from '@/lib/mailer';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

export async function POST(request) {
  try {
    const formData = await request.formData();

    const candidateId = formData.get('candidateId');
    const customSubject = formData.get('subject');
    const customBody = formData.get('body');
    const cc = formData.get('cc');

    // If new candidate fields are provided in FormData
    const fullName = formData.get('fullName');
    const email = formData.get('email');
    const role = formData.get('role');
    const department = formData.get('department');
    const joiningDate = formData.get('joiningDate');
    const endDate = formData.get('endDate');
    const duration = formData.get('duration') || '3 Months';
    const workMode = formData.get('workMode') || 'Online - Remote';
    const reportingManager = formData.get('reportingManager') || 'Priyanka Nair';
    const assignedMentor = formData.get('assignedMentor') || 'Rahul Kapoor';
    const phone = formData.get('phone') || '';
    const collegeName = formData.get('collegeName') || 'Recognized University';
    const degree = formData.get('degree') || 'Bachelor of Engineering';

    let candidate;

    if (candidateId) {
      candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
      });
    } else if (email && fullName) {
      // Create candidate
      const candId = `SF-INT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      candidate = await prisma.candidate.create({
        data: {
          candidateId: candId,
          fullName,
          email,
          phone,
          role: role || 'Web Developer Intern',
          department: department || 'Engineering',
          collegeName,
          degree,
          joiningDate: joiningDate || '2026-06-01',
          endDate: endDate || '2026-08-31',
          duration,
          workMode,
          reportingManager,
          assignedMentor,
          offerLetterStatus: 'Ready to Send',
          taskStatus: 'Not Assigned',
        },
      });
    }

    if (!candidate) {
      return NextResponse.json({ success: false, error: 'Candidate information required' }, { status: 400 });
    }

    // Generate unique acceptance token
    const acceptanceToken = crypto.randomBytes(24).toString('hex');
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { offerAcceptanceToken: acceptanceToken },
    });
    candidate.offerAcceptanceToken = acceptanceToken;

    // 1. Generate Offer Letter PDF with Playwright and save to storage
    const pdfResult = await generateOfferLetterPdf(candidate);

    // 2. Process extra attachments (images/files uploaded by admin)
    const attachments = [
      {
        filename: pdfResult.filename,
        content: pdfResult.pdfBuffer,
        contentType: 'application/pdf',
      },
    ];

    const extraFiles = formData.getAll('attachments');
    for (const file of extraFiles) {
      if (file && typeof file === 'object' && file.name) {
        const buffer = Buffer.from(await file.arrayBuffer());
        attachments.push({
          filename: file.name,
          content: buffer,
          contentType: file.type || 'application/octet-stream',
        });
      }
    }

    // 3. Email Body with Acceptance Trigger
    const acceptUrl = `${APP_URL}/api/offers/accept?token=${acceptanceToken}`;

    const subject =
      customSubject ||
      `Internship Offer Letter - ${candidate.fullName} (${candidate.candidateId}) | Shortfundly`;

    const htmlBody = customBody
      ? `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
          ${customBody.replace(/\n/g, '<br>')}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${acceptUrl}" style="background: linear-gradient(135deg, #2563eb, #38bdf8); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              ACCEPT INTERNSHIP OFFER
            </a>
            <p style="color: #64748b; font-size: 12px; margin-top: 8px;">Direct link: ${acceptUrl}</p>
          </div>
        </div>`
      : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #090d16, #1e293b); padding: 28px 24px; text-align: center; border-bottom: 3px solid #38bdf8;">
            <h1 style="color: #38bdf8; margin: 0; font-size: 24px; letter-spacing: 2px;">SHORTFUNDLY</h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">Shortfundly Media Technologies Pvt. Ltd. • Internship Automation</p>
          </div>
          <div style="padding: 32px 28px;">
            <p style="font-size: 16px; margin-top: 0;">Dear <strong>${candidate.fullName}</strong>,</p>
            <p>Congratulations! We are pleased to formally offer you an online internship as <strong>${candidate.role}</strong> in our <strong>${candidate.department}</strong> department.</p>
            
            <div style="background: #f1f5f9; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 24px 0; border-radius: 6px;">
              <p style="margin: 4px 0;"><strong>Role:</strong> ${candidate.role}</p>
              <p style="margin: 4px 0;"><strong>Department:</strong> ${candidate.department}</p>
              <p style="margin: 4px 0;"><strong>Tenure:</strong> ${candidate.joiningDate} to ${candidate.endDate} (${candidate.duration})</p>
              <p style="margin: 4px 0;"><strong>Work Mode:</strong> ${candidate.workMode}</p>
            </div>

            <p>Please review your attached official Offer Letter PDF. To formally accept and automatically initiate your role sprint deliverables and explanation schedule, click below:</p>

            <div style="text-align: center; margin: 32px 0 24px 0;">
              <a href="${acceptUrl}" style="background: linear-gradient(135deg, #2563eb, #38bdf8); color: #ffffff; padding: 15px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.35);">
                ACCEPT INTERNSHIP OFFER
              </a>
              <p style="color: #64748b; font-size: 12px; margin-top: 10px;">Direct Link: <a href="${acceptUrl}" style="color: #2563eb;">${acceptUrl}</a></p>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">Once accepted, the system will instantly generate your role-specific Sprint deliverables via Gemma 2B and send your Google Meet explanation calendar invite.</p>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
            <p style="margin: 0; font-size: 13px; color: #475569;">Warm regards,<br><strong style="color: #0f172a;">Human Resources Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.<br><span style="color: #94a3b8; font-size: 12px;">Chennai, Tamil Nadu, India | hr@shortfundly.com</span></p>
          </div>
        </div>
      `;

    // 4. Send Email via Google SMTP
    const emailResult = await sendEmail({
      candidateId: candidate.id,
      to: candidate.email,
      recipientName: candidate.fullName,
      cc: cc || undefined,
      subject,
      html: htmlBody,
      text: `Dear ${candidate.fullName}, your Shortfundly Offer Letter is attached. Accept online at: ${acceptUrl}`,
      emailType: 'OFFER_LETTER',
      attachments,
    });

    // 5. Update Candidate Status
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { offerLetterStatus: 'Sent' },
    });

    return NextResponse.json({
      success: true,
      candidate,
      pdfPath: pdfResult.filePath,
      emailResult,
    });
  } catch (error) {
    console.error('Single offer letter dispatch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
