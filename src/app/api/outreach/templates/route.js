import { NextResponse } from 'next/server';
import { getSession, isTeamLeadOrAdmin, isAdmin } from '@/lib/auth.js';
import { getDb, logAuditEvent } from '@/lib/db.js';
import { applySecurityHeaders, validateCsrfOrigin } from '@/lib/security.js';

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  try {
    const rawTemplates = db
      .prepare('SELECT id, title, subject_template, body_template, is_default, attachments, created_at FROM email_templates ORDER BY is_default DESC, title ASC')
      .all();
    const templates = rawTemplates.map((t) => {
      let parsedAttachments = [];
      try {
        if (t.attachments) {
          parsedAttachments = typeof t.attachments === 'string' ? JSON.parse(t.attachments) : t.attachments;
        }
      } catch {
        parsedAttachments = [];
      }
      return {
        ...t,
        attachments: Array.isArray(parsedAttachments) ? parsedAttachments : [],
      };
    });
    const response = NextResponse.json({ templates });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Templates] Error:', err);
    return NextResponse.json({ error: 'Failed to retrieve templates.' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Admin and Team Lead can create or edit templates
  if (!isTeamLeadOrAdmin(session)) {
    return NextResponse.json(
      { error: 'Access denied: Only Admins and Team Leads can manage email templates.' },
      { status: 403 }
    );
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'CSRF security validation failed.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { id, title, subject_template, body_template, attachments = [] } = body;

    if (!title?.trim() || !subject_template?.trim() || !body_template?.trim()) {
      return NextResponse.json(
        { error: 'Template title, subject, and body content are required.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const templateId = id ? id.trim() : 'tpl_' + Date.now();
    const now = new Date().toISOString();
    const serializedAttachments = Array.isArray(attachments)
      ? JSON.stringify(attachments)
      : typeof attachments === 'string'
      ? attachments
      : '[]';

    db.prepare(`
      INSERT INTO email_templates (id, title, subject_template, body_template, is_default, attachments, created_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        subject_template = excluded.subject_template,
        body_template = excluded.body_template,
        attachments = excluded.attachments
    `).run(templateId, title.trim(), subject_template.trim(), body_template.trim(), serializedAttachments, now);

    logAuditEvent('TEMPLATE_SAVED', { id: templateId, title }, session.email);

    const response = NextResponse.json({
      success: true,
      id: templateId,
      message: 'Template saved successfully.',
    });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Templates POST] Error:', err);
    return NextResponse.json({ error: 'Failed to save template.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Admin can delete templates
  if (!isAdmin(session)) {
    return NextResponse.json(
      { error: 'Access denied: Only Administrators can delete templates.' },
      { status: 403 }
    );
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'CSRF validation failed.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Template ID required.' }, { status: 400 });
  }

  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Template not found.' }, { status: 404 });
    }

    if (existing.is_default === 1) {
      return NextResponse.json({ error: 'Default official system template cannot be deleted.' }, { status: 400 });
    }

    db.prepare('DELETE FROM email_templates WHERE id = ?').run(id);
    logAuditEvent('TEMPLATE_DELETED', { id, title: existing.title }, session.email);

    const response = NextResponse.json({ success: true, message: 'Template deleted.' });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete template.' }, { status: 500 });
  }
}
