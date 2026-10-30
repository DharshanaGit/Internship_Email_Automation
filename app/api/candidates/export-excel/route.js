export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batch = searchParams.get('batch');
    const role = searchParams.get('role');
    const format = (searchParams.get('format') || 'xlsx').toLowerCase();

    const where = {};
    if (batch && batch !== 'ALL') where.batch = batch;
    if (role && role !== 'ALL') where.role = { contains: role, mode: 'insensitive' };

    const candidates = await prisma.candidate.findMany({
      where,
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
        'Intern ID': c.internId || c.candidateId,
        'Candidate Name': c.fullName,
        'Email ID': c.email,
        'Phone Number': c.phone || '',
        'Role / Designation': c.role,
        'Department': c.department,
        'College Name': c.collegeName || '',
        'Degree': c.degree || '',
        'Batch': c.batch || 'Batch A',
        'Tenure Start Date': c.joiningDate,
        'Tenure End Date': c.endDate,
        'Internship Duration': c.duration,
        'Monthly Stipend': c.stipend || 'Rs. 10,000',
        'Work Mode': c.workMode,
        'Reporting Manager': c.reportingManager,
        'Assigned Mentor': c.assignedMentor,
        'Offer Letter Status': c.offerLetterStatus,
        'Task Status': c.taskStatus,
        'Tasks Completed': c.tasksCompleted || 0,
        'Performance Score (%)': `${(c.performancePercentage ?? 100).toFixed(1)}%`,
        'Active Task ID': task ? task.taskId : 'N/A',
        'Active Task Title': task ? task.title : 'Not Assigned',
        'Explanation Call Date': task ? task.explanationDate : '',
        'Explanation Call Time': task ? task.explanationTime : '',
        'Google Meet Link': task ? task.meetLink : (c.googleMeetUrl || ''),
        'Review Date': task ? task.reviewDate : '',
        'Internship Status': c.isLeaved ? 'Leaved' : 'Active',
        'Departure Reason': c.leaveReason || '',
      };
    });

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Interns_Directory');

    if (format === 'csv') {
      const csvBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'csv' });
      return new NextResponse(csvBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="Shortfundly_Interns_Export.csv"',
        },
      });
    }

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Shortfundly_Interns_Export.xlsx"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
