export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { checkAndDispatchDueJoiningTasks } from '@/lib/taskPipelineService.js';
import { getAppBaseUrl } from '@/lib/offerService.js';

export async function POST() {
  try {
    const baseUrl = getAppBaseUrl();
    const result = await checkAndDispatchDueJoiningTasks(baseUrl);
    return NextResponse.json({
      success: true,
      message: `Checked joining dates: ${result.dispatchedCount} first tasks dispatched.`,
      dispatchedCount: result.dispatchedCount,
      dispatched: result.dispatched,
    });
  } catch (error) {
    console.error('Error triggering due joining tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
