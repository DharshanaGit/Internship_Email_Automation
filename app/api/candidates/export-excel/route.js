export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const candidates = await prisma.candidate.findMany({
      orderBy: { candidateId: 'asc' },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const rows = candidates.map((c) => {
      const task = c.tasks[0];
      return {
        'Candidate ID': c.candidateId,
        'Full Name': c.fullName,
        'Email ID': c.email,
        'Phone Number': c.phone || '',
        'Designation/Internship Role': c.role,
        'Department': c.department,
        'College Name': c.collegeName || '',
        'Degree': c.degree || '',
        'Joining Date': c.joiningDate,
        'Internship End Date': c.endDate,
        'Internship Duration': c.duration,
        'Work Mode': c.workMode,
        'Reporting Manager': c.reportingManager,
        'Assigned Mentor': c.assignedMentor,
        'Offer Letter Status': c.offerLetterStatus,
        'Task Status': c.taskStatus,
        'Assigned Task Title': task ? task.title : 'Not Assigned',
        'Explanation Date': task ? task.explanationDate : '',
        'Explanation Time': task ? task.explanationTime : '',
        'Google Meet Link': task ? task.meetLink : '',
        'Review Date': task ? task.reviewDate : '',
        'Mentor Feedback': task ? task.feedback || '' : '',
        'Remarks': c.remarks || '',
      };
    });

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Internship_Candidates');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Shortfundly_Internship_Candidates_Updated.xlsx"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
