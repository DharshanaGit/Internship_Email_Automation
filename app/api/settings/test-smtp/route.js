export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { testSmtpConnection } from '../../../../lib/mailer';

export async function POST() {
  try {
    const result = await testSmtpConnection();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
