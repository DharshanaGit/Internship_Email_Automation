import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOfferLetterPdf } from '@/lib/pdfEngine';
import { sendEmail } from '@/lib/mailer';
import { enqueueBulkOfferLetters } from '@/lib/queueWorker';
import { generateSecureResponseToken, buildOfferEmailContent } from '@/lib/offerService';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3001';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      candidateIds,
      candidateRecords,
      customSubject,
      customBody,
      customPdfTemplate,
      templateId,
      cc,
      deadline,
      commonDeadline,
      forceResend = false,
      directDispatch = true,
    } = body;

    let targets = [];

    if (candidateIds && Array.isArray(candidateIds) && candidateIds.length > 0) {
      targets = await prisma.candidate.findMany({
        where: { id: { in: candidateIds } },
      });
    } else if (candidateRecords && Array.isArray(candidateRecords) && candidateRecords.length > 0) {
      for (const rec of candidateRecords) {
        if (!rec.email || !rec.fullName) continue;
        const candId = rec.candidateId || `SF-INT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const upserted = await prisma.candidate.upsert({
          where: { candidateId: candId },
          update: {
            fullName: rec.fullName,
            email: rec.email.toLowerCase(),
            phone: rec.phone || null,
            role: rec.role || 'Web Developer Intern',
            department: rec.department || 'Engineering',
            collegeName: rec.collegeName || null,
            degree: rec.degree || null,
            joiningDate: rec.joiningDate || '2026-06-01',
            endDate: rec.endDate || '2026-08-31',
            duration: rec.duration || '3 Months',
            stipend: rec.stipend || 'Rs. 10,000',
            workMode: rec.workMode || 'Online - Remote',
            reportingManager: rec.reportingManager || 'Priyanka Nair',
            assignedMentor: rec.assignedMentor || 'Rahul Kapoor',
            batch: rec.batch || 'Batch A',
          },
          create: {
            candidateId: candId,
            internId: rec.internId || null,
            fullName: rec.fullName,
            email: rec.email.toLowerCase(),
            phone: rec.phone || null,
            role: rec.role || 'Web Developer Intern',
            department: rec.department || 'Engineering',
            collegeName: rec.collegeName || null,
            degree: rec.degree || null,
            joiningDate: rec.joiningDate || '2026-06-01',
            endDate: rec.endDate || '2026-08-31',
            duration: rec.duration || '3 Months',
            stipend: rec.stipend || 'Rs. 10,000',
            workMode: rec.workMode || 'Online - Remote',
            reportingManager: rec.reportingManager || 'Priyanka Nair',
            assignedMentor: rec.assignedMentor || 'Rahul Kapoor',
            batch: rec.batch || 'Batch A',
            offerLetterStatus: 'Ready to Send',
            taskStatus: 'Not Assigned',
          },
        });
        targets.push(upserted);
      }
    }

    if (targets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid candidate recipients specified.' },
        { status: 400 }
      );
    }

    // Common deadline set by HR
    const deadlineInput = deadline || commonDeadline;
    const deadlineDate = deadlineInput ? new Date(deadlineInput) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const deadlineFormatted = deadlineDate.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Fetch template if specified
    let selectedTemplate = null;
    if (templateId) {
      selectedTemplate = await prisma.offerTemplate.findUnique({ where: { id: templateId } });
    } else {
      selectedTemplate = await prisma.offerTemplate.findFirst({ where: { isDefault: true } });
    }

    const pdfTemplateToUse = customPdfTemplate || selectedTemplate?.pdfTemplate || null;

    const results = [];
    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const candidate of targets) {
      if (candidate.offerLetterStatus === 'Sent' && !forceResend) {
        skippedCount++;
        results.push({
          candidateId: candidate.id,
          fullName: candidate.fullName,
          email: candidate.email,
          status: 'SKIPPED',
          message: 'Offer letter already dispatched previously.',
        });
        continue;
      }

      try {
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

        // 1. Generate individual personalized PDF
        const pdfResult = await generateOfferLetterPdf(candidate, pdfTemplateToUse);

        await prisma.candidate.update({
          where: { id: candidate.id },
          data: { offerPdfPath: pdfResult.filePath },
        });

        // 2. Prepare personalized email
        const responseLink = `${APP_URL}/offers/respond?token=${rawToken}`;
        const emailContent = buildOfferEmailContent({
          candidate,
          template: selectedTemplate,
          customSubject,
          customBody,
          deadlineStr: deadlineFormatted,
          responseLink,
        });

        // 3. Dispatch email with attachment
        const emailResult = await sendEmail({
          candidateId: candidate.id,
          to: candidate.email,
          recipientName: candidate.fullName,
          cc: cc || undefined,
          subject: emailContent.subject,
          html: emailContent.html,
          text: `Official Internship Offer from Shortfundly for ${candidate.fullName}. Review and sign your offer before ${deadlineFormatted}: ${responseLink}`,
          emailType: 'OFFER_LETTER',
          attachments: [
            {
              filename: pdfResult.filename,
              content: pdfResult.pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });

        // 4. Update status in DB
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: {
            offerLetterStatus: 'Sent',
            offerDeliveryStatus: emailResult.status,
            offerLetterSentAt: new Date(),
          },
        });

        sentCount++;
        results.push({
          candidateId: candidate.id,
          fullName: candidate.fullName,
          email: candidate.email,
          status: 'SENT',
          emailResult,
        });
      } catch (err) {
        failedCount++;
        console.error(`Failed to send offer letter to ${candidate.email}:`, err);
        results.push({
          candidateId: candidate.id,
          fullName: candidate.fullName,
          email: candidate.email,
          status: 'FAILED',
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: targets.length,
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error) {
    console.error('Bulk offer letter error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
