import { getDb, logAuditEvent, getEffectiveSmtpSettings } from './db.js';
import { getMailerTransporter, classifySmtpError, formatSmtpErrorMessage } from './mailer.js';
import { wrapInEmailLayout } from './templates.js';
import { config } from './config.js';

/**
 * Converts rich HTML into clean, well-spaced plain text fallback
 */
export function htmlToPlainText(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '  • ')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Creates and queues a new outreach record in PENDING state atomically
 */
export function queueOutreachJob(data, userEmail) {
  const db = getDb();
  const id = 'out_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();

  // Generate structured plain text for optimal deliverability and accessibility
  const plainText = htmlToPlainText(data.body_html);

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

    // DELIVERABILITY OPTIMIZATION:
    // When sending through Google SMTP (smtp.gmail.com) with a @gmail.com account,
    // setting RFC5322 "From:" to a third-party domain (e.g. campus@shortfundly.com)
    // without matching domain DKIM/SPF causes recipient mail servers to fail DMARC/SPF and route to SPAM.
    // Setting "From:" to the authenticated Google account email guarantees 100% DKIM (signed by Google)
    // and 100% SPF PASS.
    // Setting "Reply-To:" to campus@shortfundly.com ensures all recipient replies route directly to the official campus inbox.
    const smtpUser = (smtp.user || '').trim();
    const isGmailUser = smtpUser.toLowerCase().endsWith('@gmail.com') || smtpUser.toLowerCase().endsWith('@googlemail.com');

    const effectiveFromEmail = isGmailUser ? smtpUser : (smtp.from_email || config.FROM_EMAIL || smtpUser);
    const officialReplyTo = (smtp.from_email || config.FROM_EMAIL || 'campus@shortfundly.com').trim();

    const plainText = job.body_text || htmlToPlainText(job.body_html);

    const info = await transporter.sendMail({
      from: `"${fromName}" <${effectiveFromEmail}>`,
      to: job.email,
      replyTo: `"${fromName}" <${officialReplyTo}>`,
      subject: job.subject,
      text: plainText,
      html: fullHtml,
      headers: {
        'List-Unsubscribe': `<mailto:${officialReplyTo}?subject=Unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': outreachId,
        'X-Mailer': 'Shortfundly Campus Outreach Engine v1.0',
        'Feedback-ID': `campus-outreach:shortfundly:${smtpUser}`,
      },
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
    const cleanErrorMessage = formatSmtpErrorMessage(error);

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
      cleanErrorMessage,
      error.response || null,
      outreachId
    );

    logAuditEvent('OUTREACH_FAILED', {
      id: outreachId,
      email: job.email,
      classification,
      error: cleanErrorMessage
    }, userEmail);

    return {
      success: false,
      status: finalStatus,
      classification,
      error: cleanErrorMessage,
    };
  }
}
