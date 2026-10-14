import { NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth.js';
import { getEffectiveSmtpSettings, setSystemSetting, logAuditEvent } from '@/lib/db.js';
import { resetMailerTransporter } from '@/lib/mailer.js';
import { applySecurityHeaders, validateCsrfOrigin } from '@/lib/security.js';

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Admin can view SMTP configuration
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Access denied: Administrator privileges required.' }, { status: 403 });
  }

  const smtp = getEffectiveSmtpSettings();

  // Return masked representation — NEVER expose the secret password!
  const safeData = {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    user: smtp.user,
    from_email: smtp.from_email,
    from_name: smtp.from_name,
    auth_method: smtp.auth_method,
    is_configured: smtp.is_configured,
    pass_masked: smtp.pass ? '••••••••••••••••' : '',
  };

  const response = NextResponse.json(safeData);
  applySecurityHeaders(response.headers);
  return response;
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Admin can modify SMTP configuration
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Access denied: Administrator privileges required.' }, { status: 403 });
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'CSRF security validation failed.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { host, port, secure, user, pass, from_email, from_name, auth_method } = body;

    if (!user?.trim()) {
      return NextResponse.json({ error: 'Google Account / SMTP Username is required.' }, { status: 400 });
    }

    const currentSmtp = getEffectiveSmtpSettings();

    // Preserve existing password if bullets or empty submitted
    let finalPass = currentSmtp.pass;
    if (pass && !pass.includes('•') && pass.trim().length > 0) {
      finalPass = pass.trim();
    }

    setSystemSetting('smtp_host', (host || 'smtp.gmail.com').trim(), session.email);
    setSystemSetting('smtp_port', String(port || 465).trim(), session.email);
    setSystemSetting('smtp_secure', secure ? '1' : '0', session.email);
    setSystemSetting('smtp_user', user.trim(), session.email);
    if (finalPass) {
      setSystemSetting('smtp_pass', finalPass, session.email);
    }
    setSystemSetting('from_email', (from_email || user).trim(), session.email);
    setSystemSetting('from_name', (from_name || 'Shortfundly Campus Outreach').trim(), session.email);
    setSystemSetting('smtp_auth_method', (auth_method || 'app_password').trim(), session.email);

    // Reset cached transporter so changes take immediate effect
    resetMailerTransporter();

    logAuditEvent('SMTP_CONFIG_UPDATED', {
      user: user.trim(),
      host: host || 'smtp.gmail.com',
      port: port || 465,
    }, session.email);

    const response = NextResponse.json({
      success: true,
      message: 'Google SMTP settings saved securely.',
    });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Admin SMTP POST] Error:', err);
    return NextResponse.json({ error: 'Failed to update SMTP settings.' }, { status: 500 });
  }
}
