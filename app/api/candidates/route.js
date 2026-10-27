export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';

const singleCandidateSchema = z.object({
  candidateId: z.string().min(1, 'Candidate ID is required'),
  fullName: z.string().min(1, 'Full Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  role: z.string().min(1, 'Designation / Role is required'),
  department: z.string().min(1, 'Department is required'),
  collegeName: z.string().optional(),
  degree: z.string().optional(),
  joiningDate: z.string().min(1, 'Joining Date is required'),
  endDate: z.string().min(1, 'End Date is required'),
  duration: z.string().default('3 Months'),
  workMode: z.string().default('Online - Remote'),
  reportingManager: z.string().default('Priyanka Nair'),
  assignedMentor: z.string().default('Rahul Kapoor'),
  remarks: z.string().optional(),
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const offerStatus = searchParams.get('offerStatus') || '';
    const taskStatus = searchParams.get('taskStatus') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { candidateId: { contains: search } },
        { collegeName: { contains: search } },
      ];
    }

    if (role && role !== 'ALL') {
      where.role = { contains: role };
    }

    if (offerStatus && offerStatus !== 'ALL') {
      where.offerLetterStatus = offerStatus;
    }

    if (taskStatus && taskStatus !== 'ALL') {
      where.taskStatus = taskStatus;
    }

    const [total, candidates] = await Promise.all([
      prisma.candidate.count({ where }),
      prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tasks: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          emails: {
            orderBy: { sentAt: 'desc' },
            take: 3,
          },
          certificates: {
            take: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: candidates,
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

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = singleCandidateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidate.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: candidate }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
