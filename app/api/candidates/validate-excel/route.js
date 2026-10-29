export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { parseCandidateExcelFile } from '@/lib/excelParser';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No spreadsheet file provided. Please select an Excel or CSV file.' }, { status: 400 });
    }

    // Check file size (max 15MB)
    if (file.size && file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File size exceeds 15MB limit' }, { status: 400 });
    }

    const filename = file.name || 'candidates.xlsx';
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && !['xlsx', 'xls', 'csv'].includes(ext)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file format. Please upload an .xlsx, .xls, or .csv file.' },
        { status: 400 }
      );
    }

    let buffer;
    if (typeof file.arrayBuffer === 'function') {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (Buffer.isBuffer(file)) {
      buffer = file;
    } else if (typeof file.text === 'function') {
      buffer = Buffer.from(await file.text(), 'utf-8');
    } else {
      buffer = Buffer.from(file);
    }

    // Parse and validate with ExcelJS and Zod
    const report = await parseCandidateExcelFile(buffer, filename);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Validation error in /api/candidates/validate-excel:', error);
    return NextResponse.json({ success: false, error: error.message || 'Validation failed' }, { status: 500 });
  }
}
