export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

function handleLogout() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Permanently clear root session cookie across all paths
  response.cookies.set(COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
  });

  return response;
}

export async function POST() {
  return handleLogout();
}

export async function GET() {
  return handleLogout();
}
