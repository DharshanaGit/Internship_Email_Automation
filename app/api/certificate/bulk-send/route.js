import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { generateCertificatePdf } from '@/lib/pdfEngine';
import { sendEmail } from '@/lib/mailer';

export async function POST(request) {
  try {
    let file = null;
    let customSubject = null;
    let customBody = null;
    let cc = null;
    let directCandidateIds = null;
    let extraFiles = [];

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const jsonBody = await request.json();
      customSubject = jsonBody.subject || jsonBody.customSubject;
      customBody = jsonBody.body || jsonBody.customBody;
      cc = jsonBody.cc;
      directCandidateIds = jsonBody.candidateIds;
    } else {
      const formData = await request.formData();
      file = formData.get('file');
      customSubject = formData.get('subject') || formData.get('customSubject');
      customBody = formData.get('body') || formData.get('customBody');
      cc = formData.get('cc');
      directCandidateIds = formData.get('candidateIds');
      extraFiles = formData.getAll('attachments');
    }

    let candidateIdsToProcess = [];

    if (file && typeof file === 'object') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        return NextResponse.json({ success: false, error: 'Empty Excel worksheet' }, { status: 400 });
      }

      // Collect IDs or Names from file
      const uploadedIdentifiers = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const val1 = String(row.getCell(1).value || '').trim();
        const val2 = String(row.getCell(2).value || '').trim();
        const val3 = String(row.getCell(3).value || '').trim();
        if (val1) uploadedIdentifiers.push(val1);
        if (val2 && !uploadedIdentifiers.includes(val2)) uploadedIdentifiers.push(val2);
        if (val3 && !uploadedIdentifiers.includes(val3)) uploadedIdentifiers.push(val3);
      });

      // Find matching candidates in DB
      const matched = await prisma.candidate.findMany({
        where: {
          OR: [
            { candidateId: { in: uploadedIdentifiers } },
            { email: { in: uploadedIdentifiers } },
            { fullName: { in: uploadedIdentifiers } },
          ],
        },
      });

      candidateIdsToProcess = matched.map((c) => c.id);
    } else if (directCandidateIds) {
      try {
        candidateIdsToProcess = JSON.parse(directCandidateIds);
      } catch (e) {
        candidateIdsToProcess = [directCandidateIds];
      }
    }

    if (candidateIdsToProcess.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No matching completed candidates found in the provided Excel list.' },
        { status: 400 }
      );
    }

    // Process supplemental attachments (images/files uploaded by admin)
    const extraAttachments = [];
    for (const extraFile of extraFiles) {
      if (extraFile && typeof extraFile === 'object' && extraFile.name) {
        const buf = Buffer.from(await extraFile.arrayBuffer());
        extraAttachments.push({
          filename: extraFile.name,
          content: buf,
          contentType: extraFile.type || 'application/octet-stream',
        });
      }
    }

    const results = [];

    for (const candId of candidateIdsToProcess) {
      try {
        const candidate = await prisma.candidate.findUnique({ where: { id: candId } });
        if (!candidate) continue;

        // Strict Evaluation Check: Candidates with tasks completed < 1 get NO certificate
        const tasksCompleted = candidate.tasksCompleted || 0;
        if (tasksCompleted < 1 && candidate.taskStatus !== 'Completed') {
          results.push({
            candidateId: candidate.candidateId,
            name: candidate.fullName,
            success: false,
            error: 'Ineligible: 0 tasks completed. Candidates with completed tasks < 1 receive NO certificate.',
          });
          continue;
        }

        const certNumber = `SF-CERT-2026-${candidate.candidateId.split('-').pop() || Date.now()}`;
        const issueDate = candidate.endDate || new Date().toISOString().split('T')[0];

        // Generate Certificate PDF
        const pdfResult = await generateCertificatePdf(candidate, certNumber, issueDate);

        // Record Certificate in DB
        await prisma.certificate.upsert({
          where: { certificateNumber: certNumber },
          update: { sentAt: new Date(), pdfPath: pdfResult.filePath },
          create: {
            candidateId: candidate.id,
            certificateNumber: certNumber,
            issueDate,
            pdfPath: pdfResult.filePath,
            sentAt: new Date(),
          },
        });

        // Mark candidate task as Completed
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: { taskStatus: 'Completed' },
        });

        // Email subject & body
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
                <p>Your official signed certificate has been generated and is attached to this email as a high-resolution PDF document.</p>
                <p style="margin-top: 26px;">Warm regards,<br><strong>Selvam</strong><br>Founder & CEO<br>Shortfundly Media Technologies Pvt. Ltd.</p>
              </div>
            </div>
          `;

        const emailAttachments = [
          {
            filename: pdfResult.filename,
            content: pdfResult.pdfBuffer,
            contentType: 'application/pdf',
          },
          ...extraAttachments,
        ];

        // Send Email
        const emailRes = await sendEmail({
          candidateId: candidate.id,
          to: candidate.email,
          recipientName: candidate.fullName,
          cc: cc || undefined,
          subject,
          html: htmlBody,
          text: customBody || `Dear ${candidate.fullName}, your Shortfundly Internship Certificate is attached.`,
          emailType: 'COMPLETION_CERTIFICATE',
          attachments: emailAttachments,
        });

        results.push({
          candidateId: candidate.candidateId,
          name: candidate.fullName,
          certNumber,
          success: true,
          emailRes,
        });
      } catch (err) {
        results.push({
          candidateId: candId,
          success: false,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      successCount: results.filter((r) => r.success).length,
      results,
    });
  } catch (error) {
    console.error('Bulk certificate dispatch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
