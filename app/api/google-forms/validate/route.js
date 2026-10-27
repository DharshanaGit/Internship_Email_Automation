import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateGoogleFormSchema } from '@/lib/googleFormsService';

export async function POST(request) {
  try {
    const { formUrl, batchId } = await request.json();

    if (!formUrl) {
      return NextResponse.json({ success: false, error: 'Form URL is required.' }, { status: 400 });
    }

    let batchRoles = [];
    if (batchId) {
      const batch = await prisma.internshipBatch.findUnique({ where: { id: batchId } });
      if (batch?.roles) {
        batchRoles = Array.isArray(batch.roles) ? batch.roles : JSON.parse(batch.roles);
      }
    }

    const validationResult = await validateGoogleFormSchema(formUrl, batchRoles);
    return NextResponse.json({ success: true, ...validationResult });
  } catch (error) {
    console.error('Google form validation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
