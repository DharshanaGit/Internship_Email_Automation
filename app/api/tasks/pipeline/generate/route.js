export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { calculateBatchRoleTaskTimeline } from '@/lib/taskPipelineService.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { batchName, tasksPerMonth = 3, customTotalTasks } = body;

    if (!batchName) {
      return NextResponse.json(
        { success: false, error: 'batchName is required.' },
        { status: 400 }
      );
    }

    const batchPipeline = await calculateBatchRoleTaskTimeline({
      batchName,
      tasksPerMonth: parseInt(tasksPerMonth, 10) || 3,
      customTotalTasks: customTotalTasks ? parseInt(customTotalTasks, 10) : null,
    });

    return NextResponse.json({
      success: true,
      batchPipeline,
    });
  } catch (error) {
    console.error('Error generating batch task pipeline:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
