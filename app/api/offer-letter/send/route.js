import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOfferLetterPdf } from '@/lib/pdfEngine';
import { sendEmail } from '@/lib/mailer';
import { enqueueBulkOfferLetters } from '@/lib/queueWorker';

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateIds, candidateRecords, customSubject, customBody, cc, forceResend = false } = body;

    let targets = [];

    // Mode 1: Array of IDs from database
    if (candidateIds && Array.isArray(candidateIds) && candidateIds.length > 0) {
      targets = await prisma.candidate.findMany({
        where: { id: { in: candidateIds } },
      });
    } else if (candidateRecords && Array.isArray(candidateRecords) && candidateRecords.length > 0) {
      // Mode 2: Array of candidate data objects parsed from Excel spreadsheet
      for (const rec of candidateRecords) {
        if (!rec.email || !rec.fullName) continue;
        const candId = rec.candidateId || `SF-INT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const upserted = await prisma.candidate.upsert({
          where: { candidateId: candId },
          update: {
            fullName: rec.fullName,
            email: rec.email,
            phone: rec.phone || null,
            role: rec.role || 'Web Developer Intern',
            department: rec.department || 'Engineering',
            collegeName: rec.collegeName || null,
            degree: rec.degree || null,
            joiningDate: rec.joiningDate || '2026-06-01',
            endDate: rec.endDate || '2026-08-31',
            duration: rec.duration || '3 Months',
            workMode: rec.workMode || 'Online - Remote',
            reportingManager: rec.reportingManager || 'Priyanka Nair',
            assignedMentor: rec.assignedMentor || 'Rahul Kapoor',
          },
          create: {
            candidateId: candId,
            fullName: rec.fullName,
            email: rec.email,
            phone: rec.phone || null,
            role: rec.role || 'Web Developer Intern',
            department: rec.department || 'Engineering',
            collegeName: rec.collegeName || null,
            degree: rec.degree || null,
            joiningDate: rec.joiningDate || '2026-06-01',
            endDate: rec.endDate || '2026-08-31',
            duration: rec.duration || '3 Months',
            workMode: rec.workMode || 'Online - Remote',
            reportingManager: rec.reportingManager || 'Priyanka Nair',
            assignedMentor: rec.assignedMentor || 'Rahul Kapoor',
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

    // Default Production Mode: Push to SQLite email_queue background worker
    if (!body.directDispatch) {
      const eligible = forceResend ? targets : targets.filter((t) => t.offerLetterStatus !== 'Sent');
      if (eligible.length === 0) {
        return NextResponse.json({
          success: true,
          queued: false,
          sentCount: 0,
          skippedCount: targets.length,
          message: 'All selected candidates have already received offer letters.',
        });
      }

      await enqueueBulkOfferLetters(eligible, { customSubject, customBody, cc });

      return NextResponse.json({
        success: true,
        queued: true,
        queuedCount: eligible.length,
        skippedCount: targets.length - eligible.length,
        message: `Successfully pushed ${eligible.length} offer letters to the background queue. Dispatches are executing every 2–3 seconds.`,
      });
    }

    const results = [];
    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Dispatch loop with duplicate prevention and bounded concurrency
    for (const candidate of targets) {
      // Check duplicate send prevention
      if (candidate.offerLetterStatus === 'Sent' && !forceResend) {
        skippedCount++;
        results.push({
          candidateId: candidate.id,
          fullName: candidate.fullName,
          email: candidate.email,
          status: 'SKIPPED',
          message: 'Offer letter already dispatched previously. Enable force resend if required.',
        });
        continue;
      }

      try {
        // 1. Generate individual personalized PDF
        const pdfResult = await generateOfferLetterPdf(candidate);

        // 2. Prepare personalized subject & body
        const subject = customSubject
          ? customSubject
              .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
              .replace(/\{\{candidate_id\}\}/g, candidate.candidateId)
              .replace(/\{\{internship_role\}\}/g, candidate.role)
              .replace(/\{\{department\}\}/g, candidate.department)
              .replace(/\{\{joining_date\}\}/g, candidate.joiningDate)
          : `Internship Offer Letter - ${candidate.fullName} (${candidate.candidateId}) | Shortfundly`;

        const htmlBody = customBody
          ? `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
              ${customBody
                .replace(/\{\{candidate_name\}\}/g, candidate.fullName)
                .replace(/\{\{candidate_id\}\}/g, candidate.candidateId)
                .replace(/\{\{internship_role\}\}/g, candidate.role)
                .replace(/\{\{department\}\}/g, candidate.department)
                .replace(/\{\{joining_date\}\}/g, candidate.joiningDate)
                .replace(/\{\{end_date\}\}/g, candidate.endDate)
                .replace(/\{\{work_mode\}\}/g, candidate.workMode)
                .replace(/\n/g, '<br>')}
            </div>`
          : `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
              <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #2563eb;">
                <h1 style="color: #60a5fa; margin: 0; font-size: 24px; letter-spacing: 2px;">SHORTFUNDLY</h1>
                <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Shortfundly Media Technologies Pvt. Ltd.</p>
              </div>
              <div style="padding: 28px;">
                <p style="font-size: 16px;">Dear <strong>${candidate.fullName}</strong>,</p>
                <p>Congratulations! We are delighted to formally offer you an internship position as <strong>${candidate.role}</strong> in our <strong>${candidate.department}</strong> department.</p>
                <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 3px 0;"><strong>Role:</strong> ${candidate.role}</p>
                  <p style="margin: 3px 0;"><strong>Department:</strong> ${candidate.department}</p>
                  <p style="margin: 3px 0;"><strong>Tenure:</strong> ${candidate.joiningDate} to ${candidate.endDate} (${candidate.duration})</p>
                  <p style="margin: 3px 0;"><strong>Work Mode:</strong> ${candidate.workMode}</p>
                </div>
                <p>Please review your attached official Offer Letter PDF. Sign and return an accepted copy within 3 business days to confirm your onboarding.</p>
                <p style="margin-top: 24px;">Warm regards,<br><strong>Human Resources Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.<br><span style="color: #64748b; font-size: 12px;">Chennai, Tamil Nadu, India | hr@shortfundly.com</span></p>
              </div>
            </div>
          `;

        // 3. Dispatch email with attachment
        const emailResult = await sendEmail({
          candidateId: candidate.id,
          to: candidate.email,
          recipientName: candidate.fullName,
          subject,
          html: htmlBody,
          text: `Dear ${candidate.fullName}, your Shortfundly Offer Letter is attached.`,
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
          data: { offerLetterStatus: 'Sent' },
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
