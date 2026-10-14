import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { checkDuplicateOutreach } from '@/lib/db.js';
import { normalizeEmail } from '@/lib/config.js';
import { applySecurityHeaders, validateCsrfOrigin } from '@/lib/security.js';

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'CSRF security validation failed.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { emails } = body;

    if (!Array.isArray(emails)) {
      return NextResponse.json({ error: 'Array of email addresses is required.' }, { status: 400 });
    }

    const results = {};
    for (const rawEmail of emails.slice(0, 500)) {
      if (!rawEmail || typeof rawEmail !== 'string') continue;
      const normalized = normalizeEmail(rawEmail);
      if (!normalized) continue;

      const dup = checkDuplicateOutreach(normalized);
      results[normalized] = {
        isDuplicate: dup.isDuplicate,
        message: dup.message || null,
        daysAgo: dup.daysAgo ?? null,
        lastRecord: dup.lastRecord ? {
          college_name: dup.lastRecord.college_name,
          status: dup.lastRecord.status,
          created_at: dup.lastRecord.created_at,
          sent_at: dup.lastRecord.sent_at,
        } : null,
      };
    }

    const response = NextResponse.json({ success: true, results });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Batch Duplicate Check] Error:', err);
    return NextResponse.json({ error: 'Internal server error during duplicate analysis.' }, { status: 500 });
  }
}
