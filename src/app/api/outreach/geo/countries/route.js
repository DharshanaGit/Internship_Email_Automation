import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { getGeoCountries } from '@/lib/db.js';
import { applySecurityHeaders } from '@/lib/security.js';

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const countries = getGeoCountries();
    const response = NextResponse.json({ success: true, countries });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Geo Countries] error:', err);
    return NextResponse.json({ error: 'Failed to load countries' }, { status: 500 });
  }
}
