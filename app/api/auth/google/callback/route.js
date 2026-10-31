import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma.js';

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

function updateEnvFile(filePath, key, value) {
  try {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}\n`;
    }
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (err) {
    console.warn(`[Google Auth] Could not update ${filePath}:`, err.message);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/dashboard?googleAuthError=${encodeURIComponent(error)}`, request.url));
    }

    if (!code) {
      return NextResponse.json({ success: false, error: 'Authorization code is missing.' }, { status: 400 });
    }

    const { clientId, clientSecret } = getClientCredentials();
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    const refreshToken = tokens.refresh_token;

    if (refreshToken) {
      process.env.GOOGLE_REFRESH_TOKEN = refreshToken;

      // Persist to .env and .env.local
      updateEnvFile(path.resolve(process.cwd(), '.env'), 'GOOGLE_REFRESH_TOKEN', refreshToken);
      updateEnvFile(path.resolve(process.cwd(), '.env.local'), 'GOOGLE_REFRESH_TOKEN', refreshToken);

      // Update SystemSetting in database
      await prisma.systemSetting.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          googleCalendarConnected: true,
        },
        update: {
          googleCalendarConnected: true,
        },
      }).catch(() => {});
    }

    return NextResponse.redirect(new URL('/dashboard?googleAuth=success', request.url));
  } catch (err) {
    console.error('[Google Auth] Exchange error:', err);
    return NextResponse.redirect(new URL(`/dashboard?googleAuthError=${encodeURIComponent(err.message)}`, request.url));
  }
}
