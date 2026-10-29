import { NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(request) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, role: true },
      });
    } catch (err) {
      console.warn('DB query in /api/auth/me non-critical error:', err.message);
    }

    const resolvedUser = user || {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name || 'Operations User',
      role: decoded.role || 'ADMIN',
    };

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: resolvedUser.id,
          email: resolvedUser.email,
          name: resolvedUser.name,
          role: decoded.role || resolvedUser.role,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
