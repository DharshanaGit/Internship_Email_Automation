import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { verifySmtpConnection } from '@/lib/mailer.js';
import { applySecurityHeaders } from '@/lib/security.js';

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await verifySmtpConnection();
  const response = NextResponse.json(result);
  applySecurityHeaders(response.headers);
  return response;
}
