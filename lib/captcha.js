import crypto from 'crypto';

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'captcha-secret-salt-2026';

export function generateCaptcha() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < 5; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const timestamp = Date.now();
  const signature = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(`${text.toUpperCase()}:${timestamp}`)
    .digest('hex');

  const token = Buffer.from(`${text.toUpperCase()}:${timestamp}:${signature}`).toString('base64');

  const width = 140;
  const height = 44;
  let lines = '';
  for (let i = 0; i < 4; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(96,165,250,0.4)" stroke-width="1.5" />`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #161F36; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
    ${lines}
    <text x="22" y="30" font-family="monospace" font-size="24" font-weight="bold" fill="#60A5FA" letter-spacing="6">${text}</text>
  </svg>`;

  return {
    token,
    svg: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    answer: text,
  };
}

export function verifyCaptcha(userInput, token) {
  if (!userInput || !token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [expectedText, timestampStr, signature] = decoded.split(':');
    const timestamp = parseInt(timestampStr, 10);

    if (Date.now() - timestamp > 5 * 60 * 1000) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', CAPTCHA_SECRET)
      .update(`${expectedText}:${timestamp}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      return false;
    }

    return userInput.trim().toUpperCase() === expectedText.trim().toUpperCase();
  } catch (err) {
    return false;
  }
}

export async function verifyGoogleRecaptcha(token, secretKey) {
  if (!token) return false;
  const secret = secretKey || process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    return true;
  }

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('reCAPTCHA error:', err);
    return false;
  }
}
