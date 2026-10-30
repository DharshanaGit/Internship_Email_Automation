export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const emailType = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      where.OR = [
        { recipientEmail: { contains: search } },
        { recipientName: { contains: search } },
        { subject: { contains: search } },
      ];
    }

    if (emailType && emailType !== 'ALL') {
      where.emailType = emailType;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [total, emails, stats] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
        include: {
          candidate: {
            select: {
              id: true,
              candidateId: true,
              fullName: true,
              role: true,
              department: true,
              internId: true,
              batch: true,
            },
          },
        },
      }),
      prisma.emailLog.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const statusCounts = {
      Delivered: 0,
      Sent: 0,
      Failed: 0,
      Scheduled: 0,
    };

    stats.forEach((s) => {
      statusCounts[s.status] = s._count.id;
    });

    return NextResponse.json({
      success: true,
      data: emails,
      statusCounts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all');

    if (all === 'true') {
      await prisma.emailLog.deleteMany({});
      return NextResponse.json({ success: true, message: 'All email tracking logs deleted successfully' });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Email log ID is required' }, { status: 400 });
    }

    await prisma.emailLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Email log deleted successfully' });
  } catch (error) {
    console.error('Error deleting email log:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
