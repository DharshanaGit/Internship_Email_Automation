import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { config, normalizeEmail } from './config.js';
import { getDb, logAuditEvent } from './db.js';

const JWT_SECRET_BYTES = new TextEncoder().encode(config.JWT_SECRET);
const COOKIE_NAME = 'sf_outreach_session';

// In-memory rate limiter for login attempts (IP based)
const loginAttemptMap = new Map();

/**
 * Checks and records login attempt rate limiting
 */
export function checkLoginRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttemptMap.get(ip);

  if (!entry) {
    return { allowed: true, remaining: config.RATE_LIMIT_LOGIN_MAX };
  }

  // Check if window has expired
  if (now - entry.windowStart > config.RATE_LIMIT_LOGIN_WINDOW_SEC * 1000) {
    loginAttemptMap.delete(ip);
    return { allowed: true, remaining: config.RATE_LIMIT_LOGIN_MAX };
  }

  if (entry.count >= config.RATE_LIMIT_LOGIN_MAX) {
    const retryAfterSec = Math.ceil((entry.windowStart + config.RATE_LIMIT_LOGIN_WINDOW_SEC * 1000 - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  return { allowed: true, remaining: config.RATE_LIMIT_LOGIN_MAX - entry.count };
}

export function recordFailedLogin(ip) {
  const now = Date.now();
  const entry = loginAttemptMap.get(ip);
  if (!entry || (now - entry.windowStart > config.RATE_LIMIT_LOGIN_WINDOW_SEC * 1000)) {
    loginAttemptMap.set(ip, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

export function clearFailedLogin(ip) {
  loginAttemptMap.delete(ip);
}

/**
 * Issues signed JWT token for authenticated user
 */
export async function createSessionToken(user) {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    can_send: Boolean(user.can_send ?? 1),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.SESSION_MAX_AGE_SEC}s`)
    .sign(JWT_SECRET_BYTES);

  return token;
}

/**
 * Verifies JWT token and checks if user exists in database and is active
 */
export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES, {
      algorithms: ['HS256'],
    });

    // Verify in database that user still exists and is not deactivated
    const db = getDb();
    const user = db.prepare('SELECT id, email, role, is_active, can_send, created_at FROM users WHERE id = ?').get(payload.userId);
    if (!user || user.is_active === 0) return null;

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      is_active: Boolean(user.is_active ?? 1),
      can_send: Boolean(user.can_send ?? 1),
    };
  } catch {
    return null;
  }
}

/**
 * Validates request session from cookies or headers on every protected server route
 */
export async function getSession(request = null) {
  let token = null;

  // 1. Try cookie store
  try {
    const nextHeaders = await import('next/headers');
    if (nextHeaders && typeof nextHeaders.cookies === 'function') {
      const cookieStore = await nextHeaders.cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    }
  } catch {
    // If outside Next.js request context
  }

  // 2. Try Authorization header if request passed
  if (!token && request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  return await verifySessionToken(token);
}

/**
 * Role-Based Access Control (RBAC) authorization helpers
 */
export function isAdmin(session) {
  return session?.role === 'admin';
}

export function isTeamLeadOrAdmin(session) {
  return session?.role === 'admin' || session?.role === 'team_lead';
}

export function canSendOutreach(session) {
  if (!session) return false;
  if (session.role === 'admin' || session.role === 'team_lead') return true;
  if (session.role === 'manager') return Boolean(session.can_send);
  return false;
}

/**
 * Authenticates user credentials against SQLite users table
 */
export async function authenticateCompanyUser(email, password, ip = 'unknown') {
  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    logAuditEvent('LOGIN_BLOCKED_RATE_LIMIT', `IP: ${ip} blocked for ${rateLimit.retryAfterSec}s`, email, ip);
    return {
      success: false,
      error: `Too many failed login attempts. Please retry after ${Math.ceil(rateLimit.retryAfterSec / 60)} minute(s).`,
      status: 429,
    };
  }

  const normalized = normalizeEmail(email);
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalized);

  if (!user) {
    recordFailedLogin(ip);
    logAuditEvent('LOGIN_FAILED_UNKNOWN_USER', `Attempt for ${normalized}`, normalized, ip);
    return { success: false, error: 'Invalid company credentials or unauthorized account.', status: 401 };
  }

  if (user.is_active === 0) {
    recordFailedLogin(ip);
    logAuditEvent('LOGIN_FAILED_DEACTIVATED', `Deactivated user attempt for ${normalized}`, normalized, ip);
    return {
      success: false,
      error: 'This company account has been deactivated. Please contact an administrator.',
      status: 403,
    };
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    recordFailedLogin(ip);
    logAuditEvent('LOGIN_FAILED_BAD_PASSWORD', `Password mismatch for ${normalized}`, normalized, ip);
    return { success: false, error: 'Invalid company credentials or unauthorized account.', status: 401 };
  }

  // Clear rate limit tracking on success
  clearFailedLogin(ip);
  logAuditEvent('LOGIN_SUCCESS', `User authenticated: ${normalized} (Role: ${user.role})`, normalized, ip);

  const token = await createSessionToken(user);
  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      can_send: Boolean(user.can_send ?? 1),
    },
  };
}

export { COOKIE_NAME };
