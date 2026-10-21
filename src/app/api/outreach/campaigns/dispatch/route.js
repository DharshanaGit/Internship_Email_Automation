import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSession, canSendOutreach } from '@/lib/auth.js';
import {
  createCampaignRecord,
  checkDuplicateOutreach,
  logAuditEvent,
  updateCampaignCounters
} from '@/lib/db.js';
import { queueOutreachJob, processOutreachJob } from '@/lib/worker.js';
import { renderTemplate, validateTemplatePlaceholders } from '@/lib/templates.js';
import { applySecurityHeaders, validateCsrfOrigin } from '@/lib/security.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  if (!canSendOutreach(session)) {
    return NextResponse.json({
      error: 'Access denied: Your account is restricted to read-only access. An Administrator must enable sending permissions.'
    }, { status: 403 });
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'CSRF security validation failed.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      name,
      subject,
      bodyHtml,
      bodyText,
      templateId,
      targetCountries = [],
      targetStates = [],
      recipients = [],
      attachments = [],
      trackOpens = true,
      trackClicks = true,
      overrideDuplicate = false,
      overrideReason = '',
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Please enter a campaign name.' }, { status: 400 });
    }
    if (!subject?.trim()) {
      return NextResponse.json({ error: 'Email subject is required.' }, { status: 400 });
    }
    if (!bodyHtml?.trim()) {
      return NextResponse.json({ error: 'Email body content is required.' }, { status: 400 });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Please select at least one recipient college or contact.' }, { status: 400 });
    }

    // Step 8: Validate addresses, deduplicate within campaign, and check cooldowns
    const seenEmails = new Set();
    const uniqueRecipients = [];
    const duplicateSkipped = [];
    const invalidSkipped = [];
    const cooldownSkipped = [];

    for (const r of recipients) {
      const email = (r.email || '').trim().toLowerCase();
      if (!email || !EMAIL_REGEX.test(email)) {
        invalidSkipped.push({ college: r.college_name, email, reason: 'Invalid email syntax' });
        continue;
      }

      if (seenEmails.has(email)) {
        duplicateSkipped.push({ college: r.college_name, email, reason: 'Duplicate in current campaign selection' });
        continue;
      }
      seenEmails.add(email);

      // Check database duplicate cooldown window
      const cooldownCheck = checkDuplicateOutreach(email);
      if (cooldownCheck.isDuplicate && !overrideDuplicate) {
        cooldownSkipped.push({ college: r.college_name, email, reason: cooldownCheck.message });
        continue;
      }

      uniqueRecipients.push({
        college_name: (r.college_name || 'Academic Institution').trim(),
        email,
        department: (r.department || 'Campus Outreach').trim(),
        contact_person: (r.contact_person || '').trim(),
        designation: (r.designation || '').trim(),
        country: (r.country || r.country_name || (targetCountries[0] || 'India')).trim(),
        state: (r.state || r.state_or_region || (targetStates[0] || 'Andhra Pradesh')).trim(),
        category: (r.category || '').trim(),
        website_url: (r.website_url || '').trim(),
        phone: (r.phone || '').trim(),
      });
    }

    if (uniqueRecipients.length === 0) {
      return NextResponse.json({
        error: 'No valid or eligible recipients remained after filtering invalid emails, internal duplicates, and cooldown restrictions.',
        details: { invalidSkipped, duplicateSkipped, cooldownSkipped }
      }, { status: 400 });
    }

    // Step 1: Create Campaign Record
    const campaignId = createCampaignRecord({
      name: name.trim(),
      subject: subject.trim(),
      templateId,
      bodyHtml,
      bodyText,
      targetCountries,
      targetStates,
      selectedCollegesCount: new Set(uniqueRecipients.map(r => r.college_name)).size,
      totalRecipients: uniqueRecipients.length,
      trackOpens: trackOpens ? 1 : 0,
      trackClicks: trackClicks ? 1 : 0,
      attachments,
      createdBy: session.email,
    });

    logAuditEvent('CAMPAIGN_DISPATCH_STARTED', {
      campaignId,
      name,
      recipientsCount: uniqueRecipients.length,
      countries: targetCountries,
      states: targetStates,
      attachmentsCount: attachments.length,
    }, session.email);

    // Queue & Dispatch Recipients
    const results = [];
    let acceptedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < uniqueRecipients.length; i++) {
      const recipient = uniqueRecipients[i];
      const trackingToken = crypto.randomBytes(16).toString('hex');

      // Personalize subject & body for this specific recipient
      const personalizedSubject = renderTemplate(subject, recipient);
      const personalizedHtml = renderTemplate(bodyHtml, recipient);
      const personalizedText = renderTemplate(bodyText || '', recipient);

      const outreachId = queueOutreachJob({
        college_name: recipient.college_name,
        email: recipient.email,
        department: recipient.department,
        contact_person: recipient.contact_person,
        designation: recipient.designation,
        subject: personalizedSubject,
        body_html: personalizedHtml,
        body_text: personalizedText,
        campaign_id: campaignId,
        country: recipient.country,
        state: recipient.state,
        tracking_token: trackingToken,
        attachments,
        override_duplicate: overrideDuplicate,
        override_reason: overrideReason,
      }, session.email);

      // Process outreach job through Google SMTP
      const dispatchResult = await processOutreachJob(outreachId, session.email);

      if (dispatchResult.success) {
        acceptedCount++;
      } else {
        failedCount++;
      }

      results.push({
        outreachId,
        college: recipient.college_name,
        email: recipient.email,
        success: dispatchResult.success,
        status: dispatchResult.status,
        messageId: dispatchResult.messageId || null,
        error: dispatchResult.error || null,
      });

      // Small delay between sends to prevent throttling
      if (i < uniqueRecipients.length - 1) {
        await new Promise(res => setTimeout(res, 250));
      }
    }

    // Update campaign counters and final status
    updateCampaignCounters(campaignId);

    const response = NextResponse.json({
      success: true,
      campaignId,
      name,
      totalSubmitted: uniqueRecipients.length,
      acceptedCount,
      failedCount,
      skipped: {
        duplicates: duplicateSkipped.length,
        cooldown: cooldownSkipped.length,
        invalid: invalidSkipped.length,
      },
      results,
      message: `Campaign "${name}" processed: ${acceptedCount} SMTP accepted, ${failedCount} failed.`
    });

    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Campaign Dispatch] error:', err);
    return NextResponse.json({ error: 'Failed to dispatch campaign.' }, { status: 500 });
  }
}
