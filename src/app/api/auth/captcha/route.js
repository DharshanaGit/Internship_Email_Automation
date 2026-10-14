import { NextResponse } from 'next/server';
import { generateCaptchaChallenge, applySecurityHeaders } from '@/lib/security.js';

export async function GET(request) {
  const challenge = generateCaptchaChallenge();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(challenge.svg)}`;

  let response;

  if (format === 'image') {
    response = new NextResponse(challenge.svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
      },
    });
  } else {
    response = NextResponse.json({
      success: true,
      svg: challenge.svg,
      image: dataUri,
      token: challenge.token,
    });
  }

  // Set HTTP-only, SameSite=Lax cookie with the challenge token so verification works even if client state drops token
  response.cookies.set({
    name: 'sf_captcha_token',
    value: challenge.token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 300, // 5 minutes
  });

  // Never cache CAPTCHA challenges
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  applySecurityHeaders(response.headers);
  return response;
}
