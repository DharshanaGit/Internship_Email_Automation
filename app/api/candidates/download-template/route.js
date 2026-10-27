import { NextResponse } from 'next/server';
import exceljs from 'exceljs';

export async function GET() {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Candidates');

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 22 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Role', key: 'role', width: 24 },
      { header: 'Degree', key: 'degree', width: 20 },
      { header: 'College', key: 'college', width: 28 },
      { header: 'JoiningDate', key: 'joiningDate', width: 16 },
      { header: 'Duration', key: 'duration', width: 14 },
      { header: 'Stipend', key: 'stipend', width: 14 },
    ];

    // Style Header Row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7C3AED' }, // Shortfundly purple
    };

    // Add clean starter template rows
    worksheet.addRow({
      name: 'Priya Sundaram',
      email: 'priya.sundaram@example.com',
      phone: '+919876543210',
      role: 'Frontend Developer',
      degree: 'B.Tech IT',
      college: 'Anna University, Chennai',
      joiningDate: '2026-06-01',
      duration: '3 Months',
      stipend: '10000',
    });

    worksheet.addRow({
      name: 'Karthik Raja',
      email: 'karthik.raja@example.com',
      phone: '+919876543211',
      role: 'Backend Developer',
      degree: 'B.E. Computer Science',
      college: 'PSG College of Technology',
      joiningDate: '2026-06-01',
      duration: '3 Months',
      stipend: '10000',
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Shortfundly_Bulk_Offer_Template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
