import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken, signToken, COOKIE_NAME } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const roleSchema = z.object({
  role: z.enum(['ADMIN', 'HR', 'CEO']),
});

export async function POST(request) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = roleSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid role selected' }, { status: 400 });
    }

    const newRole = parseResult.data.role;

    // Fetch user from SQLite database via Prisma ORM
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Update role in database for user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: newRole },
    });

    // Sign new JWT with updated active role
    const newToken = signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: newRole,
    });

    const response = NextResponse.json({
      success: true,
      message: `Active role switched to ${newRole}`,
      role: newRole,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const host = request.headers.get('host') || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
    const secureCookie = isProduction && !isLocal && isHttps;

    response.cookies.set(COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
