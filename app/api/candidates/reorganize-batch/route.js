export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, candidateId, candidateIds, targetBatchName, newBatchName } = body;

    // 1. Create a new custom batch
    if (action === 'CREATE_BATCH') {
      if (!newBatchName || !newBatchName.trim()) {
        return NextResponse.json({ success: false, error: 'Batch name is required.' }, { status: 400 });
      }

      const existing = await prisma.internshipBatch.findUnique({
        where: { batchName: newBatchName.trim() },
      });

      if (existing) {
        return NextResponse.json({ success: false, error: 'A batch with this name already exists.' }, { status: 409 });
      }

      const created = await prisma.internshipBatch.create({
        data: {
          batchName: newBatchName.trim(),
          roles: JSON.stringify(['Full Stack Intern', 'Frontend Developer', 'Backend Developer']),
          stipend: 'Rs. 10,000',
          joiningDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
          duration: '3 Months',
          status: 'Active',
        },
      });

      return NextResponse.json({ success: true, batch: created });
    }

    // 2. Delete empty batch
    if (action === 'DELETE_BATCH') {
      if (!targetBatchName) {
        return NextResponse.json({ success: false, error: 'Batch name is required.' }, { status: 400 });
      }

      const count = await prisma.candidate.count({
        where: { batch: targetBatchName },
      });

      if (count > 0) {
        return NextResponse.json({ success: false, error: `Cannot delete batch "${targetBatchName}" because it contains ${count} candidates. Reassign candidates first.` }, { status: 400 });
      }

      await prisma.internshipBatch.deleteMany({
        where: { batchName: targetBatchName },
      });

      return NextResponse.json({ success: true, message: `Batch ${targetBatchName} removed.` });
    }

    // 3. Move single candidate or bulk candidates to target batch (Drag-and-Drop)
    const idsToMove = candidateIds?.length ? candidateIds : (candidateId ? [candidateId] : []);

    if (!idsToMove.length || !targetBatchName) {
      return NextResponse.json({ success: false, error: 'Candidate IDs and target batch name are required.' }, { status: 400 });
    }

    // Ensure target batch exists in InternshipBatch table
    let batchRecord = await prisma.internshipBatch.findUnique({
      where: { batchName: targetBatchName },
    });

    if (!batchRecord) {
      batchRecord = await prisma.internshipBatch.create({
        data: {
          batchName: targetBatchName,
          roles: JSON.stringify(['Full Stack Intern', 'Frontend Developer', 'Backend Developer']),
          stipend: 'Rs. 10,000',
          joiningDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
          duration: '3 Months',
          status: 'Active',
        },
      });
    }

    await prisma.candidate.updateMany({
      where: { id: { in: idsToMove } },
      data: {
        batch: targetBatchName,
        batchId: batchRecord.id,
      },
    });

    return NextResponse.json({
      success: true,
      movedCount: idsToMove.length,
      targetBatchName,
    });
  } catch (error) {
    console.error('Error reorganizing batches:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
