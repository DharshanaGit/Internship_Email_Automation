import nodemailer from 'nodemailer';
import { getEffectiveSmtpSettings } from './db.js';

let transporter = null;

export function resetMailerTransporter() {
  if (transporter && typeof transporter.close === 'function') {
    try {
      transporter.close();
    } catch {}
  }
  transporter = null;
}

/**
 * Initializes and returns the production Nodemailer Google SMTP transporter
 */
export function getMailerTransporter(forceRefresh = false) {
  if (transporter && !forceRefresh) {
    return transporter;
  }

  const smtp = getEffectiveSmtpSettings();

  const authUser = smtp.user ? smtp.user.trim() : '';
  const authPass = smtp.pass ? smtp.pass.trim() : '';

  if (!authUser || !authPass) {
    throw new Error(
      'Production Google SMTP credentials are missing. Configure your Google Account and 16-character App Password in Settings or environment variables.'
    );
  }

  transporter = nodemailer.createTransport({
    host: smtp.host || 'smtp.gmail.com',
    port: Number(smtp.port) || 465,
    secure: Boolean(smtp.secure), // true for 465, false for 587
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    auth: {
      user: authUser,
      pass: authPass,
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });

  return transporter;
}

/**
 * Performs a live handshake verification with Google SMTP
 * Can test either saved system configuration or custom candidate settings
 */
export async function verifySmtpConnection(customConfig = null) {
  const smtp = customConfig || getEffectiveSmtpSettings();

  const authUser = smtp.user ? smtp.user.trim() : '';
  const authPass = smtp.pass ? smtp.pass.trim() : '';

  if (!authUser || !authPass) {
    return {
      success: false,
      configured: false,
      host: smtp.host || 'smtp.gmail.com',
      port: smtp.port || 465,
      user: smtp.user || null,
      message: 'SMTP credentials missing. Please provide your Google account email and 16-character App Password.',
    };
  }

  let testTransport = null;
  try {
    testTransport = nodemailer.createTransport({
      host: smtp.host || 'smtp.gmail.com',
      port: Number(smtp.port) || 465,
      secure: Boolean(smtp.secure),
      auth: {
        user: authUser,
        pass: authPass,
      },
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 12000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });

    await testTransport.verify();
    return {
      success: true,
      configured: true,
      host: smtp.host,
      port: smtp.port,
      user: smtp.user,
      message: 'Google SMTP server handshake verified successfully. Ready for campus outreach dispatches.',
    };
  } catch (err) {
    return {
      success: false,
      configured: true,
      host: smtp.host,
      port: smtp.port,
      user: smtp.user,
      message: formatSmtpErrorMessage(err),
    };
  } finally {
    if (testTransport && typeof testTransport.close === 'function') {
      try {
        testTransport.close();
      } catch {}
    }
  }
}

/**
 * Formats and sanitizes raw SMTP errors so sensitive trace or raw socket dumps aren't exposed in UI
 */
export function formatSmtpErrorMessage(error) {
  const msg = error?.message || 'SMTP delivery attempt failed.';
  if (msg.includes('535') || msg.includes('BadCredentials') || msg.includes('Username and Password not accepted')) {
    return 'Google SMTP authentication failed. Please verify your Google Account email and 16-character Google App Password in Settings.';
  }
  if (msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
    return 'Could not connect to Google SMTP server (smtp.gmail.com:465). Please check network connectivity.';
  }
  // Remove Google tracking tokens / hex socket IDs
  return msg.split('\n')[0].replace(/[a-z0-9]{15,}\.[0-9]+/gi, '').trim();
}

/**
 * Classifies SMTP errors into TRANSIENT vs PERMANENT vs UNKNOWN for resilient retry handling
 */
export function classifySmtpError(error) {
  const msg = (error?.message || '').toLowerCase();
  const code = error?.responseCode || error?.code || '';

  // 4xx or network/connection timeout = Transient failure
  if (
    (typeof code === 'number' && code >= 400 && code < 500) ||
    msg.includes('etimedout') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('enotfound') ||
    msg.includes('socket timeout') ||
    msg.includes('rate limit') ||
    msg.includes('too many connections') ||
    msg.includes('try again later')
  ) {
    return {
      type: 'TRANSIENT',
      category: 'Network / Rate Limit / Server Busy',
      retryable: true,
    };
  }

  // Ambiguous outcome where command might have dispatched before connection drop
  if (msg.includes('socket hung up') && msg.includes('data')) {
    return {
      type: 'UNKNOWN',
      category: 'Timeout during DATA transmission — outcome ambiguous',
      retryable: false,
    };
  }

  // 5xx or invalid recipient / bad credentials = Permanent failure
  return {
    type: 'PERMANENT',
    category: 'Permanent SMTP rejection or Invalid Credentials',
    retryable: false,
  };
}
