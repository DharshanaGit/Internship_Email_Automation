import { NextResponse } from 'next/server';
import { getQueueStats, startQueueWorker } from '@/lib/queueWorker';

export async function GET() {
  try {
    try {
      startQueueWorker(); // Keep worker active
    } catch (workerErr) {
      console.warn('[Queue Status Worker Init Warning]:', workerErr.message);
    }
    const stats = await getQueueStats();
    return NextResponse.json({
      success: true,
      stats: stats || { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 },
    });
  } catch (error) {
    console.warn('[Queue Status Warning]:', error.message);
    return NextResponse.json({
      success: true,
      stats: { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 },
      error: error.message,
    });
  }
}
