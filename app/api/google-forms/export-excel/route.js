import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(request) {
  try {
    const { candidates = [] } = await request.json();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Shortfundly HR System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Internship Candidates');

    worksheet.columns = [
      { header: 'Candidate ID', key: 'candidateId', width: 22 },
      { header: 'Intern ID', key: 'internId', width: 20 },
      { header: 'Full Name', key: 'fullName', width: 25 },
      { header: 'Email ID', key: 'email', width: 32 },
      { header: 'Phone Number', key: 'phone', width: 18 },
      { header: 'Designation/Internship Role', key: 'role', width: 30 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'College Name', key: 'collegeName', width: 30 },
      { header: 'Degree', key: 'degree', width: 24 },
      { header: 'Joining Date', key: 'joiningDate', width: 15 },
      { header: 'Internship End Date', key: 'endDate', width: 18 },
      { header: 'Internship Duration', key: 'duration', width: 18 },
      { header: 'Stipend', key: 'stipend', width: 16 },
      { header: 'Work Mode', key: 'workMode', width: 20 },
      { header: 'Reporting Manager', key: 'reportingManager', width: 22 },
      { header: 'Assigned Mentor', key: 'assignedMentor', width: 22 },
      { header: 'Batch Name', key: 'batch', width: 15 },
      { header: 'Offer Letter Status', key: 'offerLetterStatus', width: 20 },
      { header: 'Task Status', key: 'taskStatus', width: 18 },
    ];

    // Style header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E1B4B' }, // Deep Purple
      };
      cell.font = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11,
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    worksheet.getRow(1).height = 28;

    candidates.forEach((cand, idx) => {
      const row = worksheet.addRow({
        candidateId: cand.candidateId || `SF-INT-2026-${String(idx + 1).padStart(4, '0')}`,
        internId: cand.internId || `INT-2026-${String(idx + 1).padStart(5, '0')}`,
        fullName: cand.fullName || '',
        email: cand.email || '',
        phone: cand.phone || '',
        role: cand.role || 'Web Developer Intern',
        department: cand.department || 'Engineering',
        collegeName: cand.collegeName || 'Recognized University',
        degree: cand.degree || 'B.Tech / B.E.',
        joiningDate: cand.joiningDate || '2026-06-01',
        endDate: cand.endDate || '2026-08-31',
        duration: cand.duration || '3 Months',
        stipend: cand.stipend || 'Rs. 10,000',
        workMode: cand.workMode || 'Online - Remote',
        reportingManager: cand.reportingManager || 'Priyanka Nair',
        assignedMentor: cand.assignedMentor || 'Rahul Kapoor',
        batch: cand.batch || 'Batch A',
        offerLetterStatus: cand.offerLetterStatus || 'Ready to Send',
        taskStatus: cand.taskStatus || 'Not Assigned',
      });

      row.height = 22;
      row.alignment = { vertical: 'middle' };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Google_Forms_Candidates_Export_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export excel error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
