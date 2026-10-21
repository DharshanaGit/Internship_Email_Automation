import { NextResponse } from 'next/server';
import { getGeoCountries } from '@/lib/db.js';
import { applySecurityHeaders } from '@/lib/security.js';

export async function GET(request) {
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
