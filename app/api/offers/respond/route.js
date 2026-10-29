import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma.js';
import { uploadToCloudinary } from '@/lib/cloudinary.js';
import { sendEmail } from '@/lib/mailer.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      token,
      action,
      signatureType, // 'TYPED', 'DRAWN', 'UPLOADED'
      signatureData, // Name text, data URL, or image data
      termsAccepted,
      rejectionReason,
    } = body;

    if (!token || !action) {
      return NextResponse.json({ success: false, error: 'Token and decision action are required.' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const candidate = await prisma.candidate.findFirst({
      where: {
        OR: [
          { offerAcceptanceToken: token },
          { offerAcceptanceTokenHash: tokenHash },
          { id: token },
        ],
      },
    });

    if (!candidate) {
      return NextResponse.json({ success: false, error: 'Candidate record not found or link has expired.' }, { status: 404 });
    }

    // Check if already responded
    if (candidate.offerLetterStatus === 'Accepted' || candidate.offerLetterStatus.startsWith('Rejected')) {
      return NextResponse.json({
        success: false,
        error: `This offer has already been recorded as ${candidate.offerLetterStatus}. Further submissions are locked.`,
        alreadyResponded: true,
        status: candidate.offerLetterStatus,
      }, { status: 409 });
    }

    // Verify deadline - strictly expires only after deadline timestamp
    let deadline = candidate.offerDeadline;
    if (!deadline) {
      deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    if (candidate.offerDeadline && Date.now() > new Date(candidate.offerDeadline).getTime()) {
      return NextResponse.json({
        success: false,
        error: 'The decision deadline for this internship offer has expired. Please contact Shortfundly HR (hr@shortfundly.com) for assistance.',
        isExpired: true,
      }, { status: 410 });
    }

    const now = new Date();
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Browser';

    if (action.toUpperCase() === 'ACCEPT') {
      if (!termsAccepted) {
        return NextResponse.json({
          success: false,
          error: 'You must review and explicitly accept the Terms and Conditions before submitting your acceptance.',
        }, { status: 400 });
      }

      if (!signatureData) {
        return NextResponse.json({
          success: false,
          error: 'A digital signature (typed name, canvas drawing, or uploaded signature photo) is required to accept this offer.',
        }, { status: 400 });
      }

      let signatureUrl = null;
      let signaturePublicId = null;

      // If drawing or upload, attempt to save to Cloudinary
      if (signatureData.startsWith('data:image/')) {
        try {
          const uploadResult = await uploadToCloudinary(signatureData, {
            folder: 'shortfundly/intern_signatures',
            publicId: `sig-${candidate.id}-${Date.now()}`,
            candidateId: candidate.id,
          });
          signatureUrl = uploadResult.secureUrl;
          signaturePublicId = uploadResult.publicId;
        } catch (uploadErr) {
          console.warn('Cloudinary upload fallback to inline storage:', uploadErr.message);
          signatureUrl = signatureData;
        }
      } else {
        signatureUrl = signatureData;
      }

      // 1. Create separate digital acceptance record
      await prisma.candidateOfferAcceptance.upsert({
        where: { candidateId: candidate.id },
        update: {
          candidateName: candidate.fullName,
          internId: candidate.internId || candidate.candidateId,
          role: candidate.role,
          stipend: candidate.stipend || 'Rs. 10,000',
          joiningDate: candidate.joiningDate,
          signatureType: signatureType || 'TYPED',
          signatureData: signatureUrl,
          ipAddress: clientIp,
          userAgent: userAgent,
          acceptedAt: now,
          originalPdfPath: candidate.offerPdfPath,
        },
        create: {
          candidateId: candidate.id,
          candidateName: candidate.fullName,
          internId: candidate.internId || candidate.candidateId,
          role: candidate.role,
          stipend: candidate.stipend || 'Rs. 10,000',
          joiningDate: candidate.joiningDate,
          signatureType: signatureType || 'TYPED',
          signatureData: signatureUrl,
          ipAddress: clientIp,
          userAgent: userAgent,
          acceptedAt: now,
          originalPdfPath: candidate.offerPdfPath,
        },
      });

      // 2. Update candidate record
      const updated = await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          offerLetterStatus: 'Accepted',
          offerAcceptedAt: now,
          signatureType: signatureType || 'TYPED',
          signatureData: signatureUrl,
          signatureUrl,
          signaturePublicId,
          remarks: `Offer accepted by candidate on ${now.toISOString()} with ${signatureType || 'digital'} signature.`,
        },
      });

      // 3. Send confirmation email to candidate
      try {
        await sendEmail({
          candidateId: candidate.id,
          to: candidate.email,
          recipientName: candidate.fullName,
          subject: `Offer Acceptance Confirmed - Welcome to Shortfundly, ${candidate.fullName}!`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #09090b, #2e1065); padding: 24px; text-align: center;">
                <h2 style="color: #c084fc; margin: 0;">SHORTFUNDLY</h2>
                <p style="color: #e2e8f0; margin: 4px 0 0 0; font-size: 13px;">Internship Offer Acceptance Confirmation</p>
              </div>
              <div style="padding: 24px;">
                <p>Dear <strong>${candidate.fullName}</strong>,</p>
                <p>We have successfully recorded your digital acceptance of the internship offer for <strong>${candidate.role}</strong>.</p>
                <div style="background: #f5f3ff; border-left: 4px solid #a855f7; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
                  <p style="margin: 3px 0;"><strong>Intern ID:</strong> ${candidate.internId || candidate.candidateId}</p>
                  <p style="margin: 3px 0;"><strong>Start Date:</strong> ${candidate.joiningDate}</p>
                  <p style="margin: 3px 0;"><strong>Accepted At:</strong> ${now.toUTCString()}</p>
                </div>
                <p>Our talent onboarding team will reach out with your project briefing and welcome package prior to your start date.</p>
                <p>Warm regards,<br><strong>Shortfundly HR Team</strong></p>
              </div>
            </div>
          `,
          emailType: 'OFFER_ACCEPTANCE_CONFIRMATION',
        });

        // 4. Send notification to HR
        await sendEmail({
          to: 'hr@shortfundly.com',
          recipientName: 'Shortfundly HR',
          subject: `[Candidate Accepted] ${candidate.fullName} accepted ${candidate.role} offer (${candidate.internId || candidate.candidateId})`,
          html: `<p>Candidate <strong>${candidate.fullName}</strong> (${candidate.email}) has signed and accepted their internship offer on ${now.toUTCString()}.</p>`,
          emailType: 'HR_NOTIFICATION',
        });
      } catch (mailErr) {
        console.warn('Confirmation email dispatch warning:', mailErr.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Internship offer accepted successfully. Welcome to Shortfundly!',
        status: updated.offerLetterStatus,
        signatureUrl: updated.signatureUrl,
        acceptedAt: updated.offerAcceptedAt,
      });
    } else if (action.toUpperCase() === 'REJECT') {
      const updated = await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          offerLetterStatus: 'Rejected',
          offerRejectedAt: now,
          rejectionReason: rejectionReason || 'Candidate declined the offer.',
          remarks: `Candidate declined on ${now.toISOString()}: ${rejectionReason || 'No specific reason provided'}`,
        },
      });

      // Send rejection acknowledgement to candidate
      try {
        await sendEmail({
          candidateId: candidate.id,
          to: candidate.email,
          recipientName: candidate.fullName,
          subject: `Offer Response Recorded - Shortfundly Internship`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; line-height: 1.6; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <p>Dear <strong>${candidate.fullName}</strong>,</p>
              <p>We have recorded your response declining the internship offer for <strong>${candidate.role}</strong> at Shortfundly.</p>
              <p>Thank you for considering Shortfundly, and we wish you all the best in your future academic and professional endeavors.</p>
              <p>Best regards,<br><strong>Shortfundly Talent Team</strong></p>
            </div>
          `,
          emailType: 'OFFER_REJECTION_ACKNOWLEDGEMENT',
        });

        // Notify HR
        await sendEmail({
          to: 'hr@shortfundly.com',
          recipientName: 'Shortfundly HR',
          subject: `[Offer Declined] ${candidate.fullName} declined ${candidate.role} offer`,
          html: `<p>Candidate <strong>${candidate.fullName}</strong> (${candidate.email}) declined the internship offer. Reason: ${rejectionReason || 'None provided'}</p>`,
          emailType: 'HR_NOTIFICATION',
        });
      } catch (mailErr) {
        console.warn('Rejection notification warning:', mailErr.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Your decision has been recorded. Thank you for your time.',
        status: updated.offerLetterStatus,
        rejectedAt: updated.offerRejectedAt,
      });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid decision action.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error submitting offer decision:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
