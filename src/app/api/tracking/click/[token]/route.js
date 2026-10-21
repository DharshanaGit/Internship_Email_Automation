import { NextResponse } from 'next/server';
import { getDb, recordEmailTrackingEvent } from '@/lib/db.js';

export async function GET(request, context) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  try {
    const params = await context.params;
    const token = params?.token;

    if (token) {
      const db = getDb();
      const log = db.prepare(`SELECT id, campaign_id, email FROM outreach_logs WHERE tracking_token = ?`).get(token);

      if (log) {
        const userAgent = request.headers.get('user-agent') || 'Unknown';
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1';

        recordEmailTrackingEvent({
          outreachId: log.id,
          campaignId: log.campaign_id,
          eventType: 'CLICK',
          recipientEmail: log.email,
          userAgent,
          ipAddress: ip,
          targetUrl: targetUrl || '',
        });
      }
    }
  } catch (err) {
    console.warn('[Tracking Click] Click recording warning:', err?.message);
  }

  // Validate destination URL to prevent open redirect abuse
  if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
    return NextResponse.redirect(targetUrl, 302);
  }

  // Fallback to platform homepage
  return NextResponse.redirect(new URL('/', request.url), 302);
}
