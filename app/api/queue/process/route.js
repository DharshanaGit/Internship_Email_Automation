export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { processNextQueueItem, getQueueStats } from '@/lib/queueWorker';

export async function POST() {
  try {
    const item = await processNextQueueItem();
    const stats = await getQueueStats();
    return NextResponse.json({
      success: true,
      processedItem: item,
      stats,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
