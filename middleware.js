import { NextResponse } from 'next/server';

const COOKIE_NAME = 'sf_auth_session';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard
  if (pathname.startsWith('/dashboard')) {
    const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If user is already authenticated and visits /login, redirect to /dashboard
  if (pathname === '/login') {
    const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
