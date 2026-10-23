import nodemailer from 'nodemailer';
import { prisma } from './prisma';

export async function getSmtpConfig() {
  const setting = await prisma.systemSetting.findUnique({
    where: { id: 'default' },
  });

  const host = setting?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = setting?.smtpPort || parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = setting?.smtpSecure !== undefined ? setting.smtpSecure : port === 465;
  const user = setting?.smtpUser || process.env.SMTP_USER || 'hr@shortfundly.com';
  const pass = setting?.smtpPass || process.env.SMTP_PASS || process.env.GOOGLE_APP_PASSWORD || '';
  const senderEmail = setting?.senderEmail || user;
  const senderName = setting?.senderName || 'Shortfundly HR Team';
  const simulationMode = setting ? setting.simulationMode : true;

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
  const fromAddress = `"${config.senderName}" <${config.senderEmail}>`;

  const mailOptions = {
    from: fromAddress,
    to: to,
    subject: subject,
    text: text || html.replace(/<[^>]+>/g, ' '),
    html: html,
    attachments: attachments,
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
      body: text || html.replace(/<[^>]+>/g, ' '),
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
