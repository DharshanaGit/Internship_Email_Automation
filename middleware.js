import { NextResponse } from 'next/server';

const COOKIE_NAME = 'sf_auth_session';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard and all nested operational screens
  if (pathname.startsWith('/dashboard')) {
    const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
};
