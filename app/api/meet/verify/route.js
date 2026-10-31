import { NextResponse } from 'next/server';
import { checkGoogleMeetConnectionStatus, generateValidGoogleMeetUrl } from '@/lib/googleMeet.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await checkGoogleMeetConnectionStatus();
    return NextResponse.json({
      success: true,
      ...status,
      sampleLiveUrl: status.connected ? 'Verified with Google Cloud Calendar API' : generateValidGoogleMeetUrl(),
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      connected: false,
      status: 'ERROR',
      error: err.message,
      sampleLiveUrl: generateValidGoogleMeetUrl(),
    }, { status: 500 });
  }
}
