import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchGoogleFormResponses } from '@/lib/googleFormsService';

export async function POST(request) {
  try {
    const { formUrl, batchId } = await request.json();

    if (!formUrl || !batchId) {
      return NextResponse.json({ success: false, error: 'Form URL and Batch ID are required.' }, { status: 400 });
    }

    const batch = await prisma.internshipBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return NextResponse.json({ success: false, error: 'Batch not found.' }, { status: 404 });
    }

    // Save form URL to batch
    await prisma.internshipBatch.update({
      where: { id: batchId },
      data: { googleFormUrl: formUrl },
    });

    const result = await fetchGoogleFormResponses(formUrl, batch);
    return NextResponse.json({ success: true, batch, ...result });
  } catch (error) {
    console.error('Google form fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
