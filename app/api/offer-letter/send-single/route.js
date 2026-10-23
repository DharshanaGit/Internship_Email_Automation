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
    const stipend = formData.get('stipend') || 'Rs. 10,000';

    let candidate = null;

    // 1. Check if candidate exists by DB primary key or string candidateId
    if (candidateId) {
      candidate = await prisma.candidate.findFirst({
        where: {
          OR: [
            { id: candidateId },
            { candidateId: candidateId },
          ],
        },
      });
    }

    // 2. If not found by candidateId, check by email
    if (!candidate && email) {
      candidate = await prisma.candidate.findFirst({
        where: { email },
      });
    }

    // 3. Update existing or create new candidate
    if (candidate) {
      candidate = await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          ...(fullName ? { fullName } : {}),
          ...(email ? { email } : {}),
          ...(role ? { role } : {}),
          ...(department ? { department } : {}),
          ...(joiningDate ? { joiningDate } : {}),
          ...(endDate ? { endDate } : {}),
          ...(duration ? { duration } : {}),
          ...(workMode ? { workMode } : {}),
          ...(reportingManager ? { reportingManager } : {}),
          ...(assignedMentor ? { assignedMentor } : {}),
          ...(phone ? { phone } : {}),
          ...(collegeName ? { collegeName } : {}),
          ...(degree ? { degree } : {}),
          ...(stipend ? { stipend } : {}),
        },
      });
    } else if (email && fullName) {
      const candId = (candidateId && candidateId.startsWith('SF-'))
        ? candidateId
        : `SF-INT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;

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
          stipend,
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

    const parsedBody = customBody
      ? customBody
          .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
          .replace(/\{\{candidate_id\}\}/g, candidate.candidateId)
          .replace(/\{\{internship_role\}\}/g, candidate.role)
          .replace(/\{\{designation\}\}/g, candidate.role)
          .replace(/\{\{department\}\}/g, candidate.department)
          .replace(/\{\{joining_date\}\}/g, candidate.joiningDate)
          .replace(/\{\{end_date\}\}/g, candidate.endDate)
          .replace(/\{\{duration\}\}/g, candidate.duration || '3 Months')
          .replace(/\{\{work_mode\}\}/g, candidate.workMode || 'Online - Remote')
          .replace(/\{\{stipend\}\}/g, candidate.stipend || stipend || 'Rs. 10,000')
          .replace(/\{\{degree\}\}/g, candidate.degree || degree || 'Bachelor of Engineering')
          .replace(/\{\{college_name\}\}/g, candidate.collegeName || collegeName || 'Recognized University')
          .replace(/\{\{phone\}\}/g, candidate.phone || phone || '')
      : '';

    const htmlBody = customBody
      ? (customBody.includes('<') ? parsedBody : `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">${parsedBody.replace(/\n/g, '<br>')}</div>`)
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
              <p style="margin: 4px 0;"><strong>Stipend:</strong> ${candidate.stipend || stipend || 'Rs. 10,000'}</p>
              <p style="margin: 4px 0;"><strong>Work Mode:</strong> ${candidate.workMode}</p>
            </div>

            <p>Please find attached your official Shortfundly Internship Offer Letter PDF. Kindly review the attached offer letter and reach out to our HR team if you have any questions.</p>

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
      text: `Dear ${candidate.fullName}, your official Shortfundly Internship Offer Letter is attached. Please review the attached document.`,
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
