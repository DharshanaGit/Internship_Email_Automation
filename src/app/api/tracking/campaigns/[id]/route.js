import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { getCampaignDetails, getCampaignRecipientLogs } from '@/lib/db.js';
import { applySecurityHeaders } from '@/lib/security.js';

export async function GET(request, context) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = await context.params;
  const campaignId = params?.id;
  if (!campaignId) {
    return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q') || '';
  const status = searchParams.get('status') || 'all';
  const country = searchParams.get('country') || '';
  const state = searchParams.get('state') || '';
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  try {
    const campaign = getCampaignDetails(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const { total, records } = getCampaignRecipientLogs(campaignId, {
      search,
      status,
      country,
      state,
      limit,
      offset,
    });

    const response = NextResponse.json({
      success: true,
      campaign,
      recipients: {
        total,
        limit,
        offset,
        records,
      },
      trackingNotes: {
        smtpNote: 'Emails marked "ACCEPTED" indicate the upstream SMTP relay accepted the message for delivery. Recipient inbox arrival depends on destination mail exchangers and antispam filters.',
        openTrackingNote: 'Open tracking is measured via an invisible 1x1 tracking pixel. Due to modern privacy protections (Apple Mail Privacy Protection, Google image proxying, client image blocking), opens may be underreported.',
        clickTrackingNote: 'Link clicks are recorded when recipients navigate through tracked redirects.',
      }
    });

    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Campaign Detail] error:', err);
    return NextResponse.json({ error: 'Failed to retrieve campaign details' }, { status: 500 });
  }
}
