import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
          { candidateId: token },
          { internId: token },
        ],
      },
      include: {
        batchRel: true,
      },
    });

    if (!candidate) {
      return NextResponse.json({ success: false, error: 'Invalid or expired offer link.' }, { status: 404 });
    }

    let deadline = candidate.offerDeadline ? parseFlexibleDate(candidate.offerDeadline) : null;
    if (!deadline) {
      deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const isExpired = Boolean(deadline && Date.now() > deadline.getTime());
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
