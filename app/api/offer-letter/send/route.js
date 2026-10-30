export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { generateOfferLetterPdf } from '@/lib/pdfEngine';
import { sendEmail } from '@/lib/mailer';
import {
  generateSecureResponseToken,
  buildOfferEmailContent,
  buildCandidateResponseUrl,
} from '@/lib/offerService';

function parseFlexibleDate(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  const str = String(input).trim();
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 23;
    const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 59;
    const d = new Date(year, month, day, hours, minutes);
    if (!isNaN(d.getTime())) return d;
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

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
      forceResend = true,
      skipAlreadySent = false,
      directDispatch = true,
      additionalAttachments = [],
      bannerImageUrl = null,
    } = body;

    let targets = [];

    if (candidateIds && Array.isArray(candidateIds) && candidateIds.length > 0) {
      try {
        targets = await prisma.candidate.findMany({
          where: { id: { in: candidateIds } },
        });
      } catch (dbErr) {
        console.warn('Lookup candidateIds fallback:', dbErr.message);
      }
    } else if (candidateRecords && Array.isArray(candidateRecords) && candidateRecords.length > 0) {
      for (const rec of candidateRecords) {
        if (!rec.email || !rec.fullName) continue;
        const candId = rec.candidateId || `SF-INT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;

        try {
          // Check by candidateId or email to avoid duplicate rows
          const existing = await prisma.candidate.findFirst({
            where: {
              OR: [
                { candidateId: candId },
                { email: rec.email.toLowerCase().trim() },
              ],
            },
          });

          if (existing) {
            const updated = await prisma.candidate.update({
              where: { id: existing.id },
              data: {
                fullName: rec.fullName,
                email: rec.email.toLowerCase().trim(),
                phone: rec.phone || existing.phone,
                role: rec.role || existing.role || 'Web Developer Intern',
                department: rec.department || existing.department || 'Engineering',
                collegeName: rec.collegeName || existing.collegeName,
                degree: rec.degree || existing.degree,
                joiningDate: rec.joiningDate || existing.joiningDate || '2026-06-01',
                endDate: rec.endDate || existing.endDate || '2026-08-31',
                duration: rec.duration || existing.duration || '3 Months',
                stipend: rec.stipend || existing.stipend || 'Rs. 10,000',
                workMode: rec.workMode || existing.workMode || 'Online - Remote',
                reportingManager: rec.reportingManager || existing.reportingManager || 'Priyanka Nair',
                assignedMentor: rec.assignedMentor || existing.assignedMentor || 'Rahul Kapoor',
                batch: rec.batch || existing.batch || 'Batch A',
              },
            });
            targets.push(updated);
          } else {
            const created = await prisma.candidate.create({
              data: {
                candidateId: candId,
                internId: rec.internId || null,
                fullName: rec.fullName,
                email: rec.email.toLowerCase().trim(),
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
            targets.push(created);
          }
        } catch (saveErr) {
          console.error(`Error saving candidate record for ${rec.email}:`, saveErr.message);
          // Retry without internId if internId unique constraint collision occurred
          try {
            const fallbackCreated = await prisma.candidate.create({
              data: {
                candidateId: `SF-INT-2026-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                fullName: rec.fullName,
                email: rec.email.toLowerCase().trim(),
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
                reportingManager: 'Priyanka Nair',
                assignedMentor: 'Rahul Kapoor',
                batch: rec.batch || 'Batch A',
                offerLetterStatus: 'Ready to Send',
                taskStatus: 'Not Assigned',
              },
            });
            targets.push(fallbackCreated);
          } catch (innerErr) {
            console.error(`Fallback candidate creation failed:`, innerErr.message);
          }
        }
      }
    }

    if (targets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid candidate recipients found or selected. Please select at least one candidate.' },
        { status: 400 }
      );
    }

    // Common deadline set by HR - ensure it is in the future
    const deadlineInput = deadline || commonDeadline;
    let deadlineDate = null;
    if (deadlineInput) {
      const parsed = parseFlexibleDate(deadlineInput);
      if (!isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
        deadlineDate = parsed;
      }
    }
    // If missing or past, default to 7 days from now so the link NEVER expires immediately
    if (!deadlineDate) {
      deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const deadlineFormatted = deadlineDate.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Fetch template if specified
    let selectedTemplate = null;
    try {
      if (templateId) {
        selectedTemplate = await prisma.offerTemplate.findUnique({ where: { id: templateId } });
      } else {
        selectedTemplate = await prisma.offerTemplate.findFirst({ where: { isDefault: true } });
      }
    } catch (tmplErr) {
      console.warn('Template query fallback:', tmplErr.message);
    }

    const pdfTemplateToUse = customPdfTemplate || selectedTemplate?.pdfTemplate || null;

    const results = [];
    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const candidate of targets) {
      const shouldSkip = Boolean(skipAlreadySent) && !forceResend && candidate.offerLetterStatus === 'Sent';
      if (shouldSkip) {
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

        try {
          await prisma.candidate.update({
            where: { id: candidate.id },
            data: { offerPdfPath: pdfResult.filePath },
          });
        } catch (pdfPathErr) {
          console.warn('Could not save offerPdfPath:', pdfPathErr.message);
        }

        // 2. Prepare personalized email response link safely
        let responseLink = '';
        try {
          responseLink = buildCandidateResponseUrl(rawToken);
        } catch {
          const envUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://internship-email-automation.vercel.app';
          const cleanBase = envUrl.trim().replace(/\/+$/, '');
          responseLink = `${cleanBase}/offers/respond?token=${encodeURIComponent(rawToken)}`;
        }

        const emailContent = buildOfferEmailContent({
          candidate,
          template: selectedTemplate,
          customSubject,
          customBody,
          deadlineStr: deadlineFormatted,
          responseLink,
        });

        // 3. Attachments: personalized PDF + any HR uploaded extra documents/images
        const attachmentsList = [
          {
            filename: pdfResult.filename,
            content: pdfResult.pdfBuffer,
            contentType: 'application/pdf',
          },
        ];

        if (Array.isArray(additionalAttachments) && additionalAttachments.length > 0) {
          for (const att of additionalAttachments) {
            if (att.content && att.filename) {
              const fileBuffer = Buffer.isBuffer(att.content)
                ? att.content
                : Buffer.from(att.content, 'base64');
              attachmentsList.push({
                filename: att.filename,
                content: fileBuffer,
                contentType: att.contentType || 'application/octet-stream',
              });
            }
          }
        }

        // 4. Inject optional banner image if provided
        let finalHtml = emailContent.html;
        if (bannerImageUrl && typeof bannerImageUrl === 'string' && bannerImageUrl.trim()) {
          const bannerHtml = `
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="${bannerImageUrl.trim()}" alt="Shortfundly Banner" style="max-width: 100%; height: auto; border-radius: 8px;" />
            </div>
          `;
          finalHtml = bannerHtml + finalHtml;
        }

        // 5. Dispatch email
        const emailResult = await sendEmail({
          candidateId: candidate.id,
          to: candidate.email,
          recipientName: candidate.fullName,
          cc: cc || undefined,
          subject: emailContent.subject,
          html: finalHtml,
          text: `Official Internship Offer from Shortfundly for ${candidate.fullName}. Review and sign your offer before ${deadlineFormatted}: ${responseLink}`,
          emailType: 'OFFER_LETTER',
          attachments: attachmentsList,
        });

        // 6. Update status in DB
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
    console.error('Bulk offer letter error in /api/offer-letter/send:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to dispatch offer letters.' }, { status: 500 });
  }
}
