import { NextResponse } from 'next/server';
import { COOKIE_NAME, getSession } from '@/lib/auth.js';
import { logAuditEvent } from '@/lib/db.js';
import { applySecurityHeaders } from '@/lib/security.js';

export async function POST(request) {
  const session = await getSession(request);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

  if (session?.email) {
    logAuditEvent('LOGOUT', 'User logged out', session.email, ip);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  response.cookies.delete(COOKIE_NAME);
  applySecurityHeaders(response.headers);
  return response;
}
