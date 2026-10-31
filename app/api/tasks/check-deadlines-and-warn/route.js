export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { checkAndDispatchOverdueWarnings } from '@/lib/taskPipelineService.js';
import { getAppBaseUrl } from '@/lib/offerService.js';

export async function GET() {
  try {
    const now = new Date();

    // Query candidates with tasks past deadline that haven't been submitted
    const overdueTasks = await prisma.taskAssignment.findMany({
      where: {
        isSent: true,
        submissionStatus: 'PENDING',
        deadline: { lt: now },
        candidate: { isLeaved: false },
      },
      include: {
        candidate: true,
      },
      orderBy: { deadline: 'asc' },
    });

    const overdueList = overdueTasks.map(t => ({
      taskId: t.id,
      taskCustomId: t.taskId,
      taskNumber: t.taskNumber,
      title: t.title,
      deadline: t.deadline,
      candidateId: t.candidate.id,
      internId: t.candidate.internId || t.candidate.candidateId,
      fullName: t.candidate.fullName,
      email: t.candidate.email,
      role: t.candidate.role,
      batch: t.candidate.batch,
      performancePercentage: t.candidate.performancePercentage ?? 100.0,
      warningSentAt: t.warningSentAt,
      penaltyApplied: t.penaltyApplied || 0,
    }));

    return NextResponse.json({
      success: true,
      overdueCount: overdueList.length,
      overdueTasks: overdueList,
    });
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { penaltyAmount = 10, graceHours = 48 } = body;

    const baseUrl = getAppBaseUrl();
    const result = await checkAndDispatchOverdueWarnings({
      baseUrl,
      penaltyAmount: parseFloat(penaltyAmount) || 10,
      graceHours: parseInt(graceHours, 10) || 48,
    });

    return NextResponse.json({
      success: true,
      message: `Automated scan completed: ${result.dispatchedCount} warning email(s) dispatched with -${penaltyAmount}% performance score reduction.`,
      dispatchedCount: result.dispatchedCount,
      dispatched: result.dispatched,
    });
  } catch (error) {
    console.error('Error in automated deadline warning runner:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
