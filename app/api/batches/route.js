import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const batches = await prisma.internshipBatch.findMany({
      include: {
        _count: {
          select: { candidates: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (batches.length === 0) {
      const defaultRoles = [
        'Web Developer Intern',
        'AI Engineer Intern',
        'UI/UX Designer Intern',
        'Data Science Intern',
        'Backend Engineer Intern',
        'Full Stack Intern',
        'Digital Marketing Intern',
      ];
      const batchA = await prisma.internshipBatch.create({
        data: {
          batchName: 'Batch A',
          roles: JSON.stringify(defaultRoles),
          stipend: 'Rs. 10,000',
          joiningDate: '2026-06-01',
          endDate: '2026-08-31',
          duration: '3 Months',
          status: 'Active',
        },
        include: {
          _count: {
            select: { candidates: true },
          },
        },
      });
      return NextResponse.json({ success: true, batches: [batchA] });
    }

    return NextResponse.json({ success: true, batches });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { batchName, roles, stipend, joiningDate, endDate, duration, commonDeadline, googleFormUrl } = body;

    if (!batchName) {
      return NextResponse.json({ success: false, error: 'Batch Name is required (e.g., Batch A).' }, { status: 400 });
    }

    const existing = await prisma.internshipBatch.findUnique({
      where: { batchName },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: `Batch with name "${batchName}" already exists.` }, { status: 400 });
    }

    const rolesJson = Array.isArray(roles) ? JSON.stringify(roles) : (typeof roles === 'string' ? JSON.stringify(roles.split(',').map(r => r.trim()).filter(Boolean)) : JSON.stringify([]));

    const batch = await prisma.internshipBatch.create({
      data: {
        batchName,
        roles: rolesJson,
        stipend: stipend || 'Rs. 10,000',
        joiningDate: joiningDate || '2026-06-01',
        endDate: endDate || '2026-08-31',
        duration: duration || '3 Months',
        commonDeadline: commonDeadline ? new Date(commonDeadline) : null,
        googleFormUrl: googleFormUrl || null,
        status: 'Active',
      },
    });

    return NextResponse.json({ success: true, batch });
  } catch (error) {
    console.error('Error creating batch:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, batchName, roles, stipend, joiningDate, endDate, duration, commonDeadline, googleFormUrl, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Batch ID is required.' }, { status: 400 });
    }

    const rolesJson = roles !== undefined
      ? (Array.isArray(roles) ? JSON.stringify(roles) : (typeof roles === 'string' ? JSON.stringify(roles.split(',').map(r => r.trim()).filter(Boolean)) : JSON.stringify([])))
      : undefined;

    const batch = await prisma.internshipBatch.update({
      where: { id },
      data: {
        ...(batchName ? { batchName } : {}),
        ...(rolesJson !== undefined ? { roles: rolesJson } : {}),
        ...(stipend ? { stipend } : {}),
        ...(joiningDate ? { joiningDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(duration ? { duration } : {}),
        ...(commonDeadline !== undefined ? { commonDeadline: commonDeadline ? new Date(commonDeadline) : null } : {}),
        ...(googleFormUrl !== undefined ? { googleFormUrl } : {}),
        ...(status ? { status } : {}),
      },
    });

    // Apply latest batch configuration to all candidates in this batch that are NOT YET SENT or ACCEPTED
    // This protects already-sent or accepted offers from silent changes
    await prisma.candidate.updateMany({
      where: {
        batchId: id,
        offerLetterStatus: {
          in: ['Ready to Send', 'Not Assigned'],
        },
      },
      data: {
        ...(stipend ? { stipend } : {}),
        ...(joiningDate ? { joiningDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(duration ? { duration } : {}),
        ...(commonDeadline ? { offerDeadline: new Date(commonDeadline) } : {}),
      },
    });

    return NextResponse.json({ success: true, batch });
  } catch (error) {
    console.error('Error updating batch:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
