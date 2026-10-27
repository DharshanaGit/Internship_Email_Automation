export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseCandidateExcelFile } from '@/lib/excelParser';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'Shortfundly_Internship_Candidates_Dummy.xlsx');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Sample dataset Shortfundly_Internship_Candidates_Dummy.xlsx not found.' },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(filePath);
    const report = await parseCandidateExcelFile(buffer, 'Shortfundly_Internship_Candidates_Dummy.xlsx');

    return NextResponse.json({
      success: true,
      filename: 'Shortfundly_Internship_Candidates_Dummy.xlsx',
      report,
    });
  } catch (error) {
    console.error('Error loading sample excel:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
