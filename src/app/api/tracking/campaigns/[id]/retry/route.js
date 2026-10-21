import { NextResponse } from 'next/server';
import { getSession, canSendOutreach } from '@/lib/auth.js';
import { getDb, logAuditEvent, updateCampaignCounters } from '@/lib/db.js';
import { processOutreachJob } from '@/lib/worker.js';
import { applySecurityHeaders, validateCsrfOrigin } from '@/lib/security.js';

export async function POST(request, context) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canSendOutreach(session)) {
    return NextResponse.json({ error: 'Access denied: Sending permissions required' }, { status: 403 });
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  const params = await context.params;
  const campaignId = params?.id;
  if (!campaignId) {
    return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
  }

  const db = getDb();

  try {
    const failedRecords = db.prepare(`
      SELECT id, email, college_name, status, attempts
      FROM outreach_logs
      WHERE campaign_id = ? AND status = 'FAILED'
    `).all(campaignId);

    if (failedRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No failed recipients found in this campaign eligible for retry.',
        retried: 0,
      });
    }

    let successCount = 0;
    let failedCount = 0;
    const results = [];

    for (const record of failedRecords) {
      const result = await processOutreachJob(record.id, session.email);
      results.push({ id: record.id, email: record.email, success: result.success, error: result.error });
      if (result.success) successCount++;
      else failedCount++;
    }

    updateCampaignCounters(campaignId);

    logAuditEvent('CAMPAIGN_FAILED_RETRIED', {
      campaignId,
      totalRetried: failedRecords.length,
      successCount,
      failedCount,
    }, session.email);

    const response = NextResponse.json({
      success: true,
      message: `Retried ${failedRecords.length} failed recipient(s): ${successCount} accepted, ${failedCount} still failed.`,
      retried: failedRecords.length,
      accepted: successCount,
      stillFailed: failedCount,
      results,
    });

    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Campaign Retry] error:', err);
    return NextResponse.json({ error: 'Failed to process campaign retries' }, { status: 500 });
  }
}
