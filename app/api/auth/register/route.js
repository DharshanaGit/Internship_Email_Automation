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

    // 1. Validate Name: No numbers allowed
    if (/\d/.test(name)) {
      return NextResponse.json(
        { success: false, error: 'Full name cannot contain numbers (letters only).' },
        { status: 400 }
      );
    }

    // 2. Validate Email: No capital letters, must have '@', and must end with .com or .in
    if (/[A-Z]/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Email address cannot contain capital letters (lowercase only).' },
        { status: 400 }
      );
    }
    if (!email.includes('@')) {
      return NextResponse.json(
        { success: false, error: "Email address must contain an '@' symbol." },
        { status: 400 }
      );
    }
    if (!/\.(com|in)$/.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: "Email must end with '.com' or '.in' (e.g. name@gmail.com)." },
        { status: 400 }
      );
    }
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.(com|in)$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid lowercase email ending with '.com' or '.in'." },
        { status: 400 }
      );
    }

    // 3. Validate Strong Password: min 8 chars, small letter, caps letter, number, special symbol
    const hasMinLength = password.length >= 8;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

    if (!hasMinLength || !hasLower || !hasUpper || !hasNumber || !hasSymbol) {
      const missing = [];
      if (!hasMinLength) missing.push('min 8 characters');
      if (!hasLower) missing.push('small letter (a-z)');
      if (!hasUpper) missing.push('caps letter (A-Z)');
      if (!hasNumber) missing.push('number (0-9)');
      if (!hasSymbol) missing.push('special symbol (!@#$...)');

      return NextResponse.json(
        {
          success: false,
          error: `Password must include: ${missing.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    // Check if user already exists (with retry)
    let existingUser = null;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } catch (dbErr) {
      console.warn('Register findUnique retry triggered:', dbErr.message);
      await new Promise((r) => setTimeout(r, 300));
      existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    }

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

    let user = null;
    try {
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: role || 'HR',
        },
      });
    } catch (createErr) {
      console.warn('Register user create retry triggered:', createErr.message);
      await new Promise((r) => setTimeout(r, 300));
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: role || 'HR',
        },
      });
    }

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
