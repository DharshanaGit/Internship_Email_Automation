import { NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: decoded.role || user.role,
      },
    });
  } catch (err) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}
