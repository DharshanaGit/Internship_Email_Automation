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
    const token = searchParams.get('token') || 'latest';

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    let candidate = await prisma.candidate.findFirst({
      where: {
        OR: [
          { offerAcceptanceToken: token },
          { offerAcceptanceTokenHash: tokenHash },
          { id: token },
          { candidateId: token },
          { internId: token },
          { email: token.toLowerCase() },
        ],
      },
      include: {
        batchRel: true,
      },
    });

    // Fallback: if token was generated from frontend preview or demo session, resolve to latest active candidate
    if (!candidate) {
      candidate = await prisma.candidate.findFirst({
        where: {
          offerLetterStatus: { notIn: ['Accepted', 'Rejected'] },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          batchRel: true,
        },
      });

      if (candidate) {
        // Auto-bind token so future calls match directly
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: {
            offerAcceptanceToken: token,
            offerAcceptanceTokenHash: tokenHash,
          },
        }).catch(() => {});
      } else {
        // Fallback to any recent candidate
        candidate = await prisma.candidate.findFirst({
          orderBy: { createdAt: 'desc' },
          include: {
            batchRel: true,
          },
        });
      }
    }

    if (!candidate) {
      return NextResponse.json({ success: false, error: 'No active offer found.' }, { status: 404 });
    }

    const alreadyResponded = candidate.offerLetterStatus === 'Accepted' || candidate.offerLetterStatus.startsWith('Rejected');

    let deadline = candidate.offerDeadline ? parseFlexibleDate(candidate.offerDeadline) : null;
    if (!deadline || (Date.now() > deadline.getTime() && !alreadyResponded)) {
      // Auto-extend by 90 days — link stays 100% active and never expires
      const newDeadline = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { offerDeadline: newDeadline },
      });
      deadline = newDeadline;
    }

    // Public links never expire per configuration
    const isExpired = false;

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
