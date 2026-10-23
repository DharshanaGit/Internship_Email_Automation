import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const rowSchema = z.object({
  candidateId: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  role: z.string().min(1),
  department: z.string().min(1),
  collegeName: z.string().optional().nullable(),
  degree: z.string().optional().nullable(),
  joiningDate: z.string().min(1),
  endDate: z.string().min(1),
  duration: z.string().default('3 Months'),
  workMode: z.string().default('Online - Remote'),
  reportingManager: z.string().default('Priyanka Nair'),
  assignedMentor: z.string().default('Rahul Kapoor'),
  offerLetterStatus: z.string().default('Ready to Send'),
  taskStatus: z.string().default('Not Assigned'),
  remarks: z.string().optional().nullable(),
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet);

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'The uploaded file contains no data rows.' },
        { status: 400 }
      );
    }

    let successCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      const candidateId = String(
        row['Candidate ID'] || row['candidate_id'] || row['CandidateId'] || row['ID'] || `SF-INT-2026-${String(i + 1).padStart(4, '0')}`
      ).trim();
      const fullName = String(
        row['Full Name'] || row['Candidate Name'] || row['Name'] || row['name'] || ''
      ).trim();
      const email = String(
        row['Email ID'] || row['Email'] || row['Candidate Email'] || row['email'] || ''
      ).trim();

      if (!email || !fullName) {
        skippedCount++;
        continue;
      }

      const rowData = {
        candidateId,
        fullName,
        email,
        phone: row['Phone Number'] || row['Phone'] || row['Mobile'] ? String(row['Phone Number'] || row['Phone'] || row['Mobile']).trim() : null,
        role: String(row['Designation/Internship Role'] || row['Role'] || row['Designation'] || 'Software Engineer Intern').trim(),
        department: String(row['Department'] || row['Dept'] || 'Engineering').trim(),
        collegeName: row['College Name'] || row['College'] ? String(row['College Name'] || row['College']).trim() : 'University Partner',
        degree: row['Degree'] || row['Course'] ? String(row['Degree'] || row['Course']).trim() : 'Bachelor of Engineering',
        joiningDate: String(row['Joining Date'] || row['JoiningDate'] || '01-06-2026').trim(),
        endDate: String(row['Internship End Date'] || row['EndDate'] || '31-08-2026').trim(),
        duration: String(row['Internship Duration'] || row['Duration'] || '3 Months').trim(),
        workMode: String(row['Work Mode'] || row['WorkMode'] || 'Online - Remote').trim(),
        reportingManager: String(row['Reporting Manager'] || row['Manager'] || 'Priyanka Nair').trim(),
        assignedMentor: String(row['Assigned Mentor'] || row['Mentor'] || 'Rahul Kapoor').trim(),
        offerLetterStatus: String(row['Offer Letter Status'] || 'Ready to Send').trim(),
        taskStatus: String(row['Task Status'] || 'Not Assigned').trim(),
        remarks: row['Remarks'] ? String(row['Remarks']).trim() : null,
      };

      const parseResult = rowSchema.safeParse(rowData);
      if (!parseResult.success) {
        errors.push({
          row: i + 2,
          candidate: fullName || email,
          error: parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        });
        skippedCount++;
        continue;
      }

      await prisma.candidate.upsert({
        where: { candidateId: candidateId },
        update: parseResult.data,
        create: parseResult.data,
      });

      successCount++;
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rawRows.length,
        processed: successCount,
        skipped: skippedCount,
        errors: errors.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process bulk upload file.' },
      { status: 500 }
    );
  }
}
