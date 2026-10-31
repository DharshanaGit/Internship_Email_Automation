export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { saveAndAllocateBatchPipeline } from '@/lib/taskPipelineService.js';
import { getAppBaseUrl } from '@/lib/offerService.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      batchName,
      rolePlans,
      autoSendFirstTask = true,
    } = body;

    if (!batchName || !rolePlans) {
      return NextResponse.json(
        { success: false, error: 'batchName and rolePlans are required.' },
        { status: 400 }
      );
    }

    const baseUrl = getAppBaseUrl();
    const res = await saveAndAllocateBatchPipeline({
      batchName,
      rolePlans,
      autoSendFirstTask,
      baseUrl,
    });

    return NextResponse.json({
      success: true,
      batchName: res.batchName,
      candidatesCount: res.candidatesCount,
      task1DispatchedTotal: res.task1DispatchedTotal,
      message: `Automated pipeline allocated to ${res.candidatesCount} interns in ${batchName}! ${res.task1DispatchedTotal > 0 ? `${res.task1DispatchedTotal} Task 1 email(s) dispatched immediately.` : 'Task 1 scheduled to automatically dispatch on the batch joining date.'}`,
    });
  } catch (error) {
    console.error('Error saving batch task pipeline:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
