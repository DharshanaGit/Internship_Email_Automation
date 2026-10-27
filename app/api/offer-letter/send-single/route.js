import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOfferLetterPdf } from '@/lib/pdfEngine';
import { sendEmail } from '@/lib/mailer';
import { generateSecureResponseToken, buildOfferEmailContent, generateUniqueInternId } from '@/lib/offerService';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3001';

export async function POST(request) {
  try {
    const formData = await request.formData();

    const candidateId = formData.get('candidateId');
    const customSubject = formData.get('subject');
    const customBody = formData.get('body');
    const customPdfTemplate = formData.get('pdfTemplate');
    const templateId = formData.get('templateId');
    const cc = formData.get('cc');
    const deadlineInput = formData.get('deadline') || formData.get('commonDeadline');

    // Candidate fields
    const fullName = formData.get('fullName');
    const email = formData.get('email');
    const role = formData.get('role');
    const department = formData.get('department') || 'Engineering';
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
    const batch = formData.get('batch') || 'Batch A';

    let candidate = null;

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

    if (!candidate && email) {
      candidate = await prisma.candidate.findFirst({
        where: { email: email.toLowerCase() },
      });
    }

    // Determine offer deadline (e.g. from input or default 3 days from now)
    let deadlineDate = null;
    if (deadlineInput) {
      deadlineDate = new Date(deadlineInput);
    } else {
      deadlineDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    }

    if (candidate) {
      candidate = await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          ...(formData.get('internId') ? { internId: formData.get('internId') } : {}),
          ...(fullName ? { fullName } : {}),
          ...(email ? { email: email.toLowerCase() } : {}),
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
          ...(batch ? { batch } : {}),
          offerDeadline: deadlineDate,
        },
      });
    } else if (email && fullName) {
      const candId = (candidateId && candidateId.startsWith('SF-'))
        ? candidateId
        : `SF-INT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;

      const internId = await generateUniqueInternId();

      candidate = await prisma.candidate.create({
        data: {
          candidateId: candId,
          internId,
          fullName,
          email: email.toLowerCase(),
          phone,
          role: role || 'Web Developer Intern',
          department,
          collegeName,
          degree,
          stipend,
          joiningDate: joiningDate || '2026-06-01',
          endDate: endDate || '2026-08-31',
          duration,
          workMode,
          reportingManager,
          assignedMentor,
          batch,
          offerLetterStatus: 'Ready to Send',
          taskStatus: 'Not Assigned',
          offerDeadline: deadlineDate,
        },
      });
    }

    if (!candidate) {
      return NextResponse.json({ success: false, error: 'Candidate information is required.' }, { status: 400 });
    }

    // Fetch template if templateId passed
    let selectedTemplate = null;
    if (templateId) {
      selectedTemplate = await prisma.offerTemplate.findUnique({ where: { id: templateId } });
    } else {
      selectedTemplate = await prisma.offerTemplate.findFirst({ where: { isDefault: true } });
    }

    // Generate secure unpredictable cryptographic token and SHA-256 hash
    const { rawToken, tokenHash } = generateSecureResponseToken();

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        offerAcceptanceToken: rawToken,
        offerAcceptanceTokenHash: tokenHash,
        offerDeadline: deadlineDate,
      },
    });

    candidate.offerAcceptanceToken = rawToken;
    candidate.offerDeadline = deadlineDate;

    // 1. Generate Offer Letter PDF
    const pdfTemplateToUse = customPdfTemplate || selectedTemplate?.pdfTemplate || null;
    const pdfResult = await generateOfferLetterPdf(candidate, pdfTemplateToUse);

    // Save PDF path
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { offerPdfPath: pdfResult.filePath },
    });

    // 2. Attachments
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

    // 3. Compose Email using official Shortfundly offer structure
    const responseLink = `${APP_URL}/offers/respond?token=${rawToken}`;
    const deadlineFormatted = deadlineDate.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const emailContent = buildOfferEmailContent({
      candidate,
      template: selectedTemplate,
      customSubject,
      customBody,
      deadlineStr: deadlineFormatted,
      responseLink,
    });

    // 4. Send Email
    const emailResult = await sendEmail({
      candidateId: candidate.id,
      to: candidate.email,
      recipientName: candidate.fullName,
      cc: cc || undefined,
      subject: emailContent.subject,
      html: emailContent.html,
      text: `Official Internship Offer from Shortfundly for ${candidate.fullName}. Review and sign your offer before ${deadlineFormatted}: ${responseLink}`,
      emailType: 'OFFER_LETTER',
      attachments,
    });

    // 5. Update Candidate Status
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        offerLetterStatus: 'Sent',
        offerDeliveryStatus: emailResult.status,
        offerLetterSentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      candidate,
      pdfPath: pdfResult.filePath,
      emailResult,
      responseLink,
    });
  } catch (error) {
    console.error('Single offer letter dispatch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
