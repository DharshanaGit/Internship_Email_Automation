import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { prisma } from './prisma.js';

export function htmlToPlainText(html = '') {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '$1\n\n')
    .replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

export function wrapHtmlWithCompliance(contentHtml = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; line-height: 1.6; }
    .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; }
    .email-content { padding: 20px 0; }
    .footer { font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px; text-align: center; }
    .footer a { color: #8b5cf6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p>Shortfundly Media Technologies Pvt. Ltd. &bull; Chennai, Tamil Nadu, India</p>
      <p>Official Talent Acquisition & Internship Communication</p>
    </div>
  </div>
</body>
</html>`;
}

export async function getSmtpConfig() {
  const setting = await prisma.systemSetting.findUnique({
    where: { id: 'default' },
  });

  const host = setting?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = setting?.smtpPort || parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = setting?.smtpSecure !== undefined ? setting.smtpSecure : port === 465;
  const user = setting?.smtpUser || process.env.SMTP_USER || 'dharshana.shortfundly@gmail.com';
  const pass = setting?.smtpPass || process.env.SMTP_PASS || process.env.GOOGLE_APP_PASSWORD || '';
  const senderEmail = setting?.senderEmail || user;
  const senderName = setting?.senderName || 'Shortfundly HR Team';
  const simulationMode = setting ? Boolean(setting.simulationMode) : false;

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    senderEmail,
    senderName,
    simulationMode,
  };
}

export function createTransporter(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth.user && config.auth.pass ? config.auth : undefined,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function testSmtpConnection() {
  const config = await getSmtpConfig();
  if (!config.auth.pass) {
    return {
      success: false,
      message: 'SMTP Password / Google App Password is empty. Please enter your 16-character Google App Password in Settings.',
    };
  }

  try {
    const transporter = createTransporter(config);
    await transporter.verify();
    return {
      success: true,
      message: `Successfully connected to SMTP server (${config.host}:${config.port}) as ${config.auth.user}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to authenticate with SMTP server. Check Google App Password.',
    };
  }
}

export async function sendEmail({
  candidateId = null,
  to,
  recipientName = '',
  cc = null,
  bcc = null,
  subject,
  html,
  text,
  attachments = [],
  icalEvent = null,
  emailType = 'AUTOMATED_EMAIL',
  meetLink = null,
}) {
  const config = await getSmtpConfig();
  
  const isGmailSmtp = (config.host && config.host.includes('gmail.com')) ||
                      (config.auth.user && config.auth.user.includes('@gmail.com'));

  // Align From with authenticated Google SMTP account strictly to pass SPF/DKIM
  const authenticatedEmail = config.auth.user || config.senderEmail;
  const fromAddress = isGmailSmtp && authenticatedEmail
    ? `"${config.senderName}" <${authenticatedEmail}>`
    : `"${config.senderName}" <${config.senderEmail || authenticatedEmail}>`;

  const replyToAddress = config.senderEmail && config.senderEmail !== authenticatedEmail
    ? `"${config.senderName}" <${config.senderEmail}>`
    : fromAddress;

  const cleanPlainText = text || (html ? htmlToPlainText(html) : '');

  // Extract domain for RFC 5322 Message-ID
  const domain = authenticatedEmail && authenticatedEmail.includes('@')
    ? authenticatedEmail.split('@')[1]
    : 'gmail.com';
  const customMessageId = `<sf-${Date.now()}-${crypto.randomBytes(6).toString('hex')}@${domain}>`;

  const mailOptions = {
    from: fromAddress,
    replyTo: replyToAddress,
    to: to,
    subject: subject,
    text: cleanPlainText,
    html: html,
    attachments: attachments,
    messageId: customMessageId,
    headers: {
      'Auto-Submitted': 'auto-generated',
      'X-Entity-Ref-ID': customMessageId,
    },
  };

  if (cc && typeof cc === 'string' && cc.trim()) {
    mailOptions.cc = cc.trim();
  } else if (Array.isArray(cc) && cc.length > 0) {
    mailOptions.cc = cc.join(', ');
  }

  if (bcc && typeof bcc === 'string' && bcc.trim()) {
    mailOptions.bcc = bcc.trim();
  } else if (Array.isArray(bcc) && bcc.length > 0) {
    mailOptions.bcc = bcc.join(', ');
  }

  if (icalEvent) {
    mailOptions.icalEvent = {
      filename: 'invitation.ics',
      method: 'REQUEST',
      content: icalEvent,
    };
  }

  let sendResult = {
    status: 'Sent',
    error: null,
  };

  if (config.auth.pass && !config.simulationMode) {
    try {
      const transporter = createTransporter(config);
      const info = await transporter.sendMail(mailOptions);
      sendResult.status = 'Delivered';
      console.log(`[SMTP Live] Email dispatched to ${to}. MessageId: ${info.messageId}`);
    } catch (err) {
      console.error(`[SMTP Live Error] Sending to ${to} failed:`, err);
      sendResult.status = 'Failed';
      sendResult.error = err.message || 'SMTP dispatch error';
    }
  } else {
    console.log(`[SMTP Simulation Mode] Email prepared for ${to}: "${subject}"`);
    sendResult.status = 'Delivered';
  }

  const attachmentsMeta = attachments.map((a) => ({
    filename: a.filename,
    contentType: a.contentType || 'application/octet-stream',
  }));

  const logEntry = await prisma.emailLog.create({
    data: {
      candidateId: candidateId || undefined,
      recipientEmail: to,
      recipientName: recipientName,
      cc: mailOptions.cc || null,
      subject: subject,
      emailType: emailType,
      body: cleanPlainText,
      attachments: JSON.stringify(attachmentsMeta),
      meetLink: meetLink,
      status: sendResult.status,
      error: sendResult.error,
      sentAt: new Date(),
    },
  });

  return {
    success: sendResult.status !== 'Failed',
    logId: logEntry.id,
    status: sendResult.status,
    error: sendResult.error,
    simulationMode: config.simulationMode || !config.auth.pass,
  };
}
