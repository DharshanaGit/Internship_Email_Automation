import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, COOKIE_NAME } from '@/lib/auth';
import { verifyCaptcha, verifyGoogleRecaptcha } from '@/lib/captcha';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  role: z.string().optional(),
  captchaAnswer: z.string().optional(),
  captchaToken: z.string().optional(),
  recaptchaToken: z.string().optional(),
});

// Cyber Security: In-memory Rate Limiting to prevent brute-force attacks
const loginAttempts = new Map();
const MAX_ATTEMPTS = 10;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const now = Date.now();
    const clientRecord = loginAttempts.get(ip) || { count: 0, firstAttempt: now };

    if (now - clientRecord.firstAttempt > LOCKOUT_WINDOW_MS) {
      clientRecord.count = 0;
      clientRecord.firstAttempt = now;
    }

    if (clientRecord.count >= MAX_ATTEMPTS) {
      const waitMinutes = Math.ceil((LOCKOUT_WINDOW_MS - (now - clientRecord.firstAttempt)) / 60000);
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed login attempts. Security lockout active. Please try again in ${waitMinutes} minute(s).`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.errors.map((e) => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const { email, password, role: requestedRole, captchaAnswer, captchaToken, recaptchaToken } = parseResult.data;

    // Verify reCAPTCHA or internal visual Captcha
    if (recaptchaToken) {
      const isRecaptchaValid = await verifyGoogleRecaptcha(recaptchaToken);
      if (!isRecaptchaValid) {
        clientRecord.count++;
        loginAttempts.set(ip, clientRecord);
        return NextResponse.json(
          { success: false, error: 'Google reCAPTCHA verification failed' },
          { status: 400 }
        );
      }
    } else if (captchaAnswer && captchaToken) {
      const isCaptchaValid = verifyCaptcha(captchaAnswer, captchaToken);
      if (!isCaptchaValid) {
        clientRecord.count++;
        loginAttempts.set(ip, clientRecord);
        return NextResponse.json(
          { success: false, error: 'Invalid or expired CAPTCHA code. Please try again.' },
          { status: 400 }
        );
      }
    } else {
      clientRecord.count++;
      loginAttempts.set(ip, clientRecord);
      return NextResponse.json(
        { success: false, error: 'Please enter the CAPTCHA code.' },
        { status: 400 }
      );
    }

    // Find admin user in SQLite database via Prisma ORM
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      clientRecord.count++;
      loginAttempts.set(ip, clientRecord);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify Bcrypt password
    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      clientRecord.count++;
      loginAttempts.set(ip, clientRecord);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Reset rate limiter on successful login
    loginAttempts.delete(ip);

    // Resolve active role: Allow user to assume chosen role (ADMIN, HR, CEO) or user.role
    const availableRoles = (process.env.AVAILABLE_ROLES || 'ADMIN,HR,CEO').split(',');
    let activeRole = user.role;
    if (requestedRole && availableRoles.includes(requestedRole.toUpperCase())) {
      activeRole = requestedRole.toUpperCase();
    }

    // Sign JWT session token with active role
    const sessionToken = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: activeRole,
    });

    const response = NextResponse.json({
      success: true,
      message: `Signed in successfully as ${activeRole}`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: activeRole,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
