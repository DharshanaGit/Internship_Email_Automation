import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateId, reason, action = 'LEAVE' } = body;

    if (!candidateId) {
      return NextResponse.json({ success: false, error: 'Candidate ID is required.' }, { status: 400 });
    }

    if (action === 'REINSTATE') {
      const candidate = await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          isLeaved: false,
          leavedReason: null,
          leavedAt: null,
          taskStatus: 'Active',
        },
      });

      return NextResponse.json({
        success: true,
        message: `${candidate.fullName} has been reinstated to active internship.`,
        candidate,
      });
    }

    const candidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        isLeaved: true,
        leavedReason: reason || 'Candidate departed internship prior to tenure completion.',
        leavedAt: new Date(),
        taskStatus: 'Leaved Internship',
      },
    });

    return NextResponse.json({
      success: true,
      message: `${candidate.fullName} has been marked as Leaved Internship.`,
      candidate,
    });
  } catch (error) {
    console.error('Error recording candidate departure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
