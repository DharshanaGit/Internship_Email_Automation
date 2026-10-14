import { NextResponse } from 'next/server';
import { getSession, canSendOutreach } from '@/lib/auth.js';
import { getDb, logAuditEvent } from '@/lib/db.js';
import { processOutreachJob } from '@/lib/worker.js';
import {
  retrySchema,
  validateCsrfOrigin,
  checkSendRateLimit,
  recordSendAction,
  applySecurityHeaders,
} from '@/lib/security.js';

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  if (!canSendOutreach(session)) {
    return NextResponse.json(
      { success: false, error: 'Access denied: Your account does not have permission to retry email dispatches.' },
      { status: 403 }
    );
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ success: false, error: 'CSRF security validation failed.' }, { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const rateLimitKey = `${session.userId}:${ip}`;
  const rateCheck = checkSendRateLimit(rateLimitKey);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Sending rate limit exceeded. Please wait ${rateCheck.retryAfterSec}s before retrying.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parse = retrySchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json({ success: false, error: parse.error.errors[0]?.message }, { status: 400 });
    }

    const { id } = parse.data;
    const db = getDb();
    const existing = db.prepare('SELECT * FROM outreach_logs WHERE id = ?').get(id);

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Outreach record not found.' }, { status: 404 });
    }

    if (existing.status === 'ACCEPTED') {
      return NextResponse.json({ success: false, error: 'This email was already accepted by the SMTP server.' }, { status: 400 });
    }

    recordSendAction(rateLimitKey);
    logAuditEvent('OUTREACH_RETRY_INITIATED', { id, email: existing.email }, session.email, ip);

    const result = await processOutreachJob(id, session.email);

    const response = NextResponse.json({
      success: result.success,
      status: result.status,
      messageId: result.messageId || null,
      error: result.error || null,
      classification: result.classification || null,
    });

    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Retry] Error:', err);
    return NextResponse.json({ success: false, error: 'Retry dispatch failed.' }, { status: 500 });
  }
}
