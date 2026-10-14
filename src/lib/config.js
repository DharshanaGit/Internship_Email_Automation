import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(16).default('shortfundly_default_dev_secret_key_change_me_32char_minimum'),
  SESSION_MAX_AGE_SEC: z.coerce.number().default(28800), // 8 hours

  // Administrator Bootstrap Credentials (never hardcoded in production)
  ADMIN_EMAIL: z.string().email().default('campus@shortfundly.com'),
  ADMIN_PASSWORD: z.string().min(8).default('ShortfundlyAdmin#2026'),

  // Google SMTP Settings
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z.coerce.boolean().default(true),
  SMTP_USER: z.string().optional().default('dharshana.shortfundly@gmail.com'),
  SMTP_PASS: z.string().optional().default(''),
  FROM_EMAIL: z.string().default('campus@shortfundly.com'),
  FROM_NAME: z.string().default('Shortfundly Campus Outreach'),

  // Guardrails & Duplicate Rules
  DUPLICATE_COOLDOWN_DAYS: z.coerce.number().default(30),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().default(5),
  RATE_LIMIT_LOGIN_WINDOW_SEC: z.coerce.number().default(900),
  RATE_LIMIT_SEND_MAX: z.coerce.number().default(30),
  RATE_LIMIT_SEND_WINDOW_SEC: z.coerce.number().default(3600),
});

try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile('.env.local');
  }
} catch {
  // If .env.local does not exist, ignore and use process.env or defaults
}

let parsedConfig;

try {
  parsedConfig = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
    SESSION_MAX_AGE_SEC: process.env.SESSION_MAX_AGE_SEC,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    FROM_EMAIL: process.env.FROM_EMAIL,
    FROM_NAME: process.env.FROM_NAME,
    DUPLICATE_COOLDOWN_DAYS: process.env.DUPLICATE_COOLDOWN_DAYS,
    RATE_LIMIT_LOGIN_MAX: process.env.RATE_LIMIT_LOGIN_MAX,
    RATE_LIMIT_LOGIN_WINDOW_SEC: process.env.RATE_LIMIT_LOGIN_WINDOW_SEC,
    RATE_LIMIT_SEND_MAX: process.env.RATE_LIMIT_SEND_MAX,
    RATE_LIMIT_SEND_WINDOW_SEC: process.env.RATE_LIMIT_SEND_WINDOW_SEC,
  });
} catch (error) {
  console.warn('[Config] Falling back to safe defaults:', error?.message);
  parsedConfig = envSchema.parse({});
}

export const config = parsedConfig;

/**
 * Normalizes email address to lower-case trimmed string
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Escapes untrusted input to prevent HTML injection inside templates
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
