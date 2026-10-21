import { NextResponse } from 'next/server';
import { getSession, canSendOutreach } from '@/lib/auth.js';
import { importCollegesAndContacts, logAuditEvent } from '@/lib/db.js';
import { applySecurityHeaders, validateCsrfOrigin } from '@/lib/security.js';

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canSendOutreach(session)) {
    return NextResponse.json({ error: 'Access denied: sending/import permissions required' }, { status: 403 });
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'CSRF security validation failed' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { countryCode, countryName, stateOrRegion, rows } = body;

    if (!countryCode || !countryName || !stateOrRegion || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({
        error: 'Please provide countryCode, countryName, stateOrRegion, and a non-empty array of college rows.'
      }, { status: 400 });
    }

    const result = importCollegesAndContacts({
      countryCode: countryCode.trim().toUpperCase(),
      countryName: countryName.trim(),
      stateOrRegion: stateOrRegion.trim(),
      rows,
    });

    logAuditEvent('GEO_COLLEGES_IMPORTED', {
      country: countryName,
      state: stateOrRegion,
      collegesImported: result.collegesImported,
      contactsImported: result.contactsImported,
    }, session.email);

    const response = NextResponse.json({
      success: true,
      message: `Successfully imported ${result.collegesImported} colleges and ${result.contactsImported} contacts into ${stateOrRegion}, ${countryName}.`,
      ...result,
    });

    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Geo Import] error:', err);
    return NextResponse.json({ error: err.message || 'Failed to import colleges' }, { status: 500 });
  }
}
