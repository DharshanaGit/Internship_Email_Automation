import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { getCampaignList, createCampaignRecord } from '@/lib/db.js';
import { applySecurityHeaders, validateCsrfOrigin } from '@/lib/security.js';

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  try {
    const result = getCampaignList({ limit, offset, status });
    const response = NextResponse.json({ success: true, ...result });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Campaigns GET] error:', err);
    return NextResponse.json({ error: 'Failed to retrieve campaigns' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'CSRF security validation failed' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      name,
      subject,
      templateId,
      bodyHtml,
      bodyText,
      targetCountries = [],
      targetStates = [],
      selectedCollegesCount = 0,
      totalRecipients = 0,
      trackOpens = 1,
      trackClicks = 1
    } = body;

    if (!name?.trim() || !subject?.trim() || !bodyHtml?.trim()) {
      return NextResponse.json({ error: 'Campaign name, subject, and body HTML are required.' }, { status: 400 });
    }

    const campaignId = createCampaignRecord({
      name: name.trim(),
      subject: subject.trim(),
      templateId,
      bodyHtml,
      bodyText,
      targetCountries,
      targetStates,
      selectedCollegesCount,
      totalRecipients,
      trackOpens: trackOpens ? 1 : 0,
      trackClicks: trackClicks ? 1 : 0,
      createdBy: session.email,
    });

    const response = NextResponse.json({ success: true, campaignId, message: 'Campaign created successfully' });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Campaigns POST] error:', err);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
