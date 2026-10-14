import { NextResponse } from 'next/server';
import { authenticateCompanyUser, COOKIE_NAME } from '@/lib/auth.js';
import { loginSchema, applySecurityHeaders, verifyCaptcha } from '@/lib/security.js';
import { config } from '@/lib/config.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'Invalid input credentials.';
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const { email, password, captcha_token, captcha_answer } = parseResult.data;

    // Verify cryptographic CAPTCHA challenge (body token or cookie fallback)
    const token = captcha_token || request.cookies.get('sf_captcha_token')?.value;
    const isCaptchaValid = verifyCaptcha(token, captcha_answer);
    if (!isCaptchaValid) {
      return NextResponse.json(
        { success: false, error: 'Security verification failed: Incorrect or expired CAPTCHA code. Please enter the characters shown.' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const authResult = await authenticateCompanyUser(email, password, ip);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: authResult.user,
    });

    // Set HTTP-only, secure, SameSite session cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: authResult.token,
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: config.SESSION_MAX_AGE_SEC,
    });

    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Login] Unexpected server error:', err);
    return NextResponse.json(
      { success: false, error: err?.message ? `Authentication error: ${err.message}` : 'Internal security authentication failure.' },
      { status: 500 }
    );
  }
}
