export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [pending, processing, completed, failed, total] = await Promise.all([
      prisma.emailQueue.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.emailQueue.count({ where: { status: 'PROCESSING' } }).catch(() => 0),
      prisma.emailQueue.count({ where: { status: 'COMPLETED' } }).catch(() => 0),
      prisma.emailQueue.count({ where: { status: 'FAILED' } }).catch(() => 0),
      prisma.emailQueue.count().catch(() => 0),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        pending: pending || 0,
        processing: processing || 0,
        completed: completed || 0,
        failed: failed || 0,
        total: total || 0,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      stats: { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 },
    });
  }
}
