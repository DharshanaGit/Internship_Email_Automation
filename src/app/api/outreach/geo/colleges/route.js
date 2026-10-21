import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { getGeoColleges } from '@/lib/db.js';
import { applySecurityHeaders } from '@/lib/security.js';

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Parse countries (handles both comma-separated & multiple params)
  const countries = searchParams.getAll('countries').flatMap(c => c.split(',')).map(c => c.trim()).filter(Boolean);
  const singleCountry = searchParams.get('country');
  if (singleCountry && !countries.includes(singleCountry)) {
    countries.push(...singleCountry.split(',').map(c => c.trim()).filter(Boolean));
  }

  // Parse states
  const states = searchParams.getAll('states').flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean);
  const singleState = searchParams.get('state');
  if (singleState && !states.includes(singleState)) {
    states.push(...singleState.split(',').map(s => s.trim()).filter(Boolean));
  }

  const search = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const district = searchParams.get('district') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  try {
    const result = getGeoColleges({
      countries,
      states,
      search,
      category,
      district,
      page,
      limit,
    });

    const response = NextResponse.json({
      success: true,
      countries,
      states,
      ...result,
      hasRecords: result.total > 0,
      emptyStateMessage: result.total === 0
        ? 'No college records or contacts found for the selected geographic targeting. You can import records for this region using the CSV Import tool.'
        : null
    });

    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Geo Colleges] error:', err);
    return NextResponse.json({ error: 'Failed to query colleges' }, { status: 500 });
  }
}
