import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { checkDuplicateOutreach } from '@/lib/db.js';
import { checkDuplicateSchema, applySecurityHeaders } from '@/lib/security.js';

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parse = checkDuplicateSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json({ error: parse.error.errors[0]?.message || 'Invalid email.' }, { status: 400 });
    }

    const check = checkDuplicateOutreach(parse.data.email);
    const response = NextResponse.json(check);
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API CheckDuplicate] Error:', err);
    return NextResponse.json({ error: 'Duplicate verification failed.' }, { status: 500 });
  }
}
