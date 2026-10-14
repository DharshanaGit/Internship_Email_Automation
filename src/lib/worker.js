import { getDb, logAuditEvent, getEffectiveSmtpSettings } from './db.js';
import { getMailerTransporter, classifySmtpError } from './mailer.js';
import { wrapInEmailLayout } from './templates.js';
import { config } from './config.js';

/**
 * Creates and queues a new outreach record in PENDING state atomically
 */
export function queueOutreachJob(data, userEmail) {
  const db = getDb();
  const id = 'out_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();

  // Strip tags for plain text fallback
  const plainText = data.body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  db.prepare(`
    INSERT INTO outreach_logs (
      id, college_name, email, normalized_email, department,
      contact_person, designation, subject, body_html, body_text,
      status, failure_type, attempts, sent_by, created_at,
      override_duplicate, override_reason
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      'PENDING', 'NONE', 0, ?, ?,
      ?, ?
    )
  `).run(
    id,
    data.college_name,
    data.email,
    data.email.trim().toLowerCase(),
    data.department,
    data.contact_person || null,
    data.designation || null,
    data.subject,
    data.body_html,
    plainText,
    userEmail,
    now,
    data.override_duplicate ? 1 : 0,
    data.override_reason || null
  );

  logAuditEvent('OUTREACH_QUEUED', { id, email: data.email, college: data.college_name }, userEmail);

  return id;
}

/**
 * Worker execution unit: claims a PENDING or retryable job and dispatches
 */
export async function processOutreachJob(outreachId, userEmail = 'system') {
  const db = getDb();

  // 1. Atomically claim the job by changing status to PROCESSING
  const claimStmt = db.prepare(`
    UPDATE outreach_logs
    SET status = 'PROCESSING',
        attempts = attempts + 1,
        last_attempt_at = ?
    WHERE id = ? AND status IN ('PENDING', 'FAILED')
  `);

  const now = new Date().toISOString();
  const result = claimStmt.run(now, outreachId);

  if (result.changes === 0) {
    // Job was already claimed or does not exist
    return { success: false, message: 'Job already in progress or completed.' };
  }

  // 2. Fetch the claimed record
  const job = db.prepare('SELECT * FROM outreach_logs WHERE id = ?').get(outreachId);
  if (!job) {
    return { success: false, message: 'Job not found after claim.' };
  }

  try {
    const transporter = getMailerTransporter();
    const fullHtml = wrapInEmailLayout(job.body_html);
    const smtp = getEffectiveSmtpSettings();
    const fromName = smtp.from_name || config.FROM_NAME || 'Shortfundly Campus Outreach';
    const fromEmail = smtp.from_email || config.FROM_EMAIL || smtp.user;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: job.email,
      subject: job.subject,
      text: job.body_text,
      html: fullHtml,
    });

    const sentAt = new Date().toISOString();

    // 3. Mark as ACCEPTED upon 250 response receipt
    db.prepare(`
      UPDATE outreach_logs
      SET status = 'ACCEPTED',
          failure_type = 'NONE',
          error_message = NULL,
          smtp_response = ?,
          smtp_message_id = ?,
          sent_at = ?
      WHERE id = ?
    `).run(info.response || '250 OK Message Accepted', info.messageId || null, sentAt, outreachId);

    logAuditEvent('OUTREACH_ACCEPTED', {
      id: outreachId,
      email: job.email,
      messageId: info.messageId,
      attempts: job.attempts + 1
    }, userEmail);

    return {
      success: true,
      status: 'ACCEPTED',
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    const classification = classifySmtpError(error);
    const finalStatus = classification.type === 'UNKNOWN' ? 'UNKNOWN' : 'FAILED';

    db.prepare(`
      UPDATE outreach_logs
      SET status = ?,
          failure_type = ?,
          error_message = ?,
          smtp_response = ?
      WHERE id = ?
    `).run(
      finalStatus,
      classification.type,
      error.message || 'Unknown SMTP error',
      error.response || null,
      outreachId
    );

    logAuditEvent('OUTREACH_FAILED', {
      id: outreachId,
      email: job.email,
      classification,
      error: error.message
    }, userEmail);

    return {
      success: false,
      status: finalStatus,
      classification,
      error: error.message,
    };
  }
}
