import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getClientCredentials() {
  let clientId = process.env.GOOGLE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    for (const f of ['.env.local', '.env']) {
      const p = path.join(process.cwd(), f);
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, 'utf8');
        const idMatch = text.match(/GOOGLE_CLIENT_ID=([^\r\n]+)/);
        const secMatch = text.match(/GOOGLE_CLIENT_SECRET=([^\r\n]+)/);
        if (idMatch && !clientId) clientId = idMatch[1].trim().replace(/^['"]|['"]$/g, '');
        if (secMatch && !clientSecret) clientSecret = secMatch[1].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }

  return { clientId, clientSecret };
}

export async function GET(request) {
  try {
    const { clientId, clientSecret } = getClientCredentials();
    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in environment.',
      }, { status: 400 });
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
      ],
    });

    return NextResponse.redirect(authUrl);
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
