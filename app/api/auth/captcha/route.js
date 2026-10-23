import { NextResponse } from 'next/server';
import { generateCaptcha } from '@/lib/captcha';

export async function GET() {
  try {
    const captcha = generateCaptcha();
    return NextResponse.json({
      success: true,
      token: captcha.token,
      svg: captcha.svg,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate captcha' },
      { status: 500 }
    );
  }
}
