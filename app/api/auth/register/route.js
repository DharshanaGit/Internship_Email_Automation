import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['ADMIN', 'HR', 'CEO']).optional().default('HR'),
});

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = registerSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.errors.map((e) => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email contains uppercase
    if (/[A-Z]/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Email address cannot contain capital letters (lowercase only).' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this email address already exists. Please sign in instead.',
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: role || 'HR',
      },
    });

    // Create session token
    const sessionToken = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'Account created successfully! Welcome to Shortfundly Operations.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );

    const isProduction = process.env.NODE_ENV === 'production';
    const host = request.headers.get('host') || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const isHttps =
      request.headers.get('x-forwarded-proto') === 'https' ||
      (typeof request.nextUrl !== 'undefined' && request.nextUrl?.protocol === 'https:');
    const secureCookie = isProduction && !isLocal && isHttps;

    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during registration.' },
      { status: 500 }
    );
  }
}
