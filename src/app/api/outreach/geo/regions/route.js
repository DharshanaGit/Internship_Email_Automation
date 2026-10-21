import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { getGeoRegions } from '@/lib/db.js';
import { applySecurityHeaders } from '@/lib/security.js';

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || 'IN';

  try {
    const regions = getGeoRegions(country);
    const response = NextResponse.json({ success: true, country, regions });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Geo Regions] error:', err);
    return NextResponse.json({ error: 'Failed to load regions' }, { status: 500 });
  }
}
