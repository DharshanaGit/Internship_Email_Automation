import { NextResponse } from 'next/server';
import { getQueueStats, startQueueWorker } from '@/lib/queueWorker';

export async function GET() {
  try {
    startQueueWorker(); // Keep worker active
    const stats = await getQueueStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
