import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession, isAdmin } from '@/lib/auth.js';
import { getDb, logAuditEvent } from '@/lib/db.js';
import { normalizeEmail } from '@/lib/config.js';
import { applySecurityHeaders, validateCsrfOrigin } from '@/lib/security.js';

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Access denied: Administrator privileges required.' }, { status: 403 });
  }

  const db = getDb();
  try {
    const users = db
      .prepare('SELECT id, email, role, is_active, can_send, created_at FROM users ORDER BY created_at ASC')
      .all();

    const response = NextResponse.json({ users });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Users GET] Error:', err);
    return NextResponse.json({ error: 'Failed to retrieve company users.' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Access denied: Administrator privileges required.' }, { status: 403 });
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'CSRF security validation failed.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { email, password, role, can_send } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid company email address.' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const validRoles = ['admin', 'team_lead', 'manager'];
    const assignedRole = validRoles.includes(role) ? role : 'manager';

    const normalized = normalizeEmail(email);
    const db = getDb();

    // Check if email already registered
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized);
    if (existing) {
      return NextResponse.json({ error: 'A user account with this email address already exists.' }, { status: 409 });
    }

    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const passwordHash = bcrypt.hashSync(password, 12);
    const now = new Date().toISOString();
    const canSendVal = assignedRole === 'manager' ? (can_send ? 1 : 0) : 1;

    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, is_active, can_send, created_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(userId, normalized, passwordHash, assignedRole, canSendVal, now);

    logAuditEvent('USER_CREATED', {
      created_user: normalized,
      role: assignedRole,
      can_send: canSendVal,
    }, session.email);

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: normalized,
        role: assignedRole,
        is_active: 1,
        can_send: canSendVal,
        created_at: now,
      },
      message: `Company account for ${normalized} created successfully.`,
    });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Users POST] Error:', err);
    return NextResponse.json({ error: 'Failed to create user account.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Access denied: Administrator privileges required.' }, { status: 403 });
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'CSRF security validation failed.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { id, role, is_active, can_send, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const db = getDb();
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!targetUser) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    // Safety constraint: Administrator cannot deactivate their own active account or remove their own admin role
    if (targetUser.id === session.userId) {
      if (is_active === 0 || is_active === false) {
        return NextResponse.json(
          { error: 'Security restriction: You cannot deactivate your own active Administrator session.' },
          { status: 400 }
        );
      }
      if (role && role !== 'admin') {
        return NextResponse.json(
          { error: 'Security restriction: You cannot revoke your own Administrator role.' },
          { status: 400 }
        );
      }
    }

    const validRoles = ['admin', 'team_lead', 'manager'];
    const newRole = role && validRoles.includes(role) ? role : targetUser.role;
    const newActive = typeof is_active === 'boolean' ? (is_active ? 1 : 0) : (typeof is_active === 'number' ? is_active : targetUser.is_active);
    const newCanSend = typeof can_send === 'boolean' ? (can_send ? 1 : 0) : (typeof can_send === 'number' ? can_send : targetUser.can_send);

    if (password && password.length >= 8) {
      const newHash = bcrypt.hashSync(password, 12);
      db.prepare(`
        UPDATE users
        SET role = ?, is_active = ?, can_send = ?, password_hash = ?
        WHERE id = ?
      `).run(newRole, newActive, newCanSend, newHash, id);
    } else {
      db.prepare(`
        UPDATE users
        SET role = ?, is_active = ?, can_send = ?
        WHERE id = ?
      `).run(newRole, newActive, newCanSend, id);
    }

    logAuditEvent('USER_UPDATED', {
      user_id: id,
      user_email: targetUser.email,
      new_role: newRole,
      new_active: newActive,
      new_can_send: newCanSend,
      password_reset: Boolean(password),
    }, session.email);

    const response = NextResponse.json({
      success: true,
      message: `Account for ${targetUser.email} updated successfully.`,
    });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Users PATCH] Error:', err);
    return NextResponse.json({ error: 'Failed to update user account.' }, { status: 500 });
  }
}
