import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'sf_outreach_session';
const JWT_SECRET = process.env.JWT_SECRET || 'shortfundly_default_dev_secret_key_change_me_32char_minimum';
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);

function applySecurityHeaders(headers) {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
  );
  return headers;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET_BYTES, { algorithms: ['HS256'] });
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Redirect unauthenticated requests to login
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeaders(response.headers);
      return response;
    }
  }

  // If already authenticated and visiting /login, redirect to dashboard
  if (pathname === '/login' && isAuthenticated) {
    const dashboardUrl = new URL('/dashboard', request.url);
    const response = NextResponse.redirect(dashboardUrl);
    applySecurityHeaders(response.headers);
    return response;
  }

  const response = NextResponse.next();
  applySecurityHeaders(response.headers);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sf_logo.png).*)'],
};
