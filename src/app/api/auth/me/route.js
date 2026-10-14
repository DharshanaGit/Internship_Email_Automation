import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { applySecurityHeaders } from '@/lib/security.js';

export async function GET(request) {
  const session = await getSession(request);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const response = NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      email: session.email,
      role: session.role,
    },
  });

  applySecurityHeaders(response.headers);
  return response;
}
