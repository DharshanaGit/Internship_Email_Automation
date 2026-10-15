import { NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth.js';
import { getEffectiveSmtpSettings } from '@/lib/db.js';
import { verifySmtpConnection } from '@/lib/mailer.js';
import { applySecurityHeaders, validateCsrfOrigin } from '@/lib/security.js';

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Admin can run SMTP diagnostics
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Access denied: Administrator privileges required.' }, { status: 403 });
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'CSRF validation failed.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    let candidate = null;

    if (body.user) {
      const current = getEffectiveSmtpSettings();
      let pass = body.pass;
      if (!pass || pass.includes('•')) {
        pass = current.pass;
      }

      let testUser = (body.user || '').trim();
      if (!testUser || testUser.toLowerCase().includes('campus@shortfundly')) {
        testUser = 'dharshana.shortfundly@gmail.com';
      }

      candidate = {
        host: (body.host || 'smtp.gmail.com').trim(),
        port: Number(body.port) || 465,
        secure: Boolean(body.secure),
        user: testUser,
        pass: pass ? pass.trim() : '',
      };
    }

    const result = await verifySmtpConnection(candidate);
    const response = NextResponse.json(result);
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Admin SMTP Test] Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
