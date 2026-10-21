import { NextResponse } from 'next/server';
import { getDb, recordEmailTrackingEvent } from '@/lib/db.js';

// 1x1 transparent GIF buffer (43 bytes)
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(request, context) {
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
          eventType: 'OPEN',
          recipientEmail: log.email,
          userAgent,
          ipAddress: ip,
        });
      }
    }
  } catch (err) {
    console.warn('[Tracking Open] Tracking recording warning:', err?.message);
  }

  // Return the transparent pixel immediately with aggressive no-cache headers
  return new NextResponse(TRANSPARENT_GIF_BUFFER, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_GIF_BUFFER.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
