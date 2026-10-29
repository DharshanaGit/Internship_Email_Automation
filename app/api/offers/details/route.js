import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
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
      include: {
        batchRel: true,
      },
    });

    if (!candidate) {
      return NextResponse.json({ success: false, error: 'Invalid or expired offer link.' }, { status: 404 });
    }

    let deadline = candidate.offerDeadline;
    if (!deadline) {
      deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const isExpired = Boolean(candidate.offerDeadline && Date.now() > new Date(candidate.offerDeadline).getTime());
    const alreadyResponded = candidate.offerLetterStatus === 'Accepted' || candidate.offerLetterStatus.startsWith('Rejected');

    return NextResponse.json({
      success: true,
      candidate: {
        id: candidate.id,
        internId: candidate.internId || candidate.candidateId,
        candidateId: candidate.candidateId,
        fullName: candidate.fullName,
        email: candidate.email,
        phone: candidate.phone,
        role: candidate.role,
        department: candidate.department,
        batch: candidate.batch || candidate.batchRel?.batchName || 'Batch A',
        joiningDate: candidate.joiningDate,
        endDate: candidate.endDate,
        duration: candidate.duration,
        stipend: candidate.stipend,
        workMode: candidate.workMode,
        reportingManager: candidate.reportingManager,
        assignedMentor: candidate.assignedMentor,
        offerLetterStatus: candidate.offerLetterStatus,
        offerDeadline: deadline,
        isExpired,
        alreadyResponded,
        signatureUrl: candidate.signatureUrl,
        signatureType: candidate.signatureType,
        offerAcceptedAt: candidate.offerAcceptedAt,
        offerRejectedAt: candidate.offerRejectedAt,
        rejectionReason: candidate.rejectionReason,
        pdfUrl: `/api/offers/pdf?token=${encodeURIComponent(token)}`,
      },
    });
  } catch (error) {
    console.error('Error fetching offer details:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
