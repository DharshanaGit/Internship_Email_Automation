import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateId, reason } = body;

    if (!candidateId) {
      return NextResponse.json({ success: false, error: 'Candidate ID is required.' }, { status: 400 });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return NextResponse.json({ success: false, error: 'Candidate record not found.' }, { status: 404 });
    }

    const now = new Date();
    const revertReason = reason || 'Candidate accidentally accepted and notified HR of withdrawal.';

    const updated = await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        offerLetterStatus: 'Rejected (Submitted by mistake)',
        rejectionReason: revertReason,
        remarks: `Reclassified from Accepted to Rejected by HR on ${now.toISOString()}. Reason: ${revertReason}`,
        updatedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Candidate ${candidate.fullName} has been moved to Rejected list (Submitted by mistake).`,
      candidate: updated,
    });
  } catch (error) {
    console.error('Error reverting candidate acceptance:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
