import { NextResponse } from 'next/server';
import { generateCaptchaChallenge, applySecurityHeaders } from '@/lib/security.js';

export async function GET() {
  const challenge = generateCaptchaChallenge();
  const response = NextResponse.json({
    success: true,
    svg: challenge.svg,
    token: challenge.token,
  });

  // Ensure CAPTCHA is never cached by browser
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  applySecurityHeaders(response.headers);
  return response;
}
