import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import { applySecurityHeaders } from '@/lib/security.js';

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  try {
    const totalRow = db.prepare('SELECT COUNT(*) as c FROM outreach_logs').get();
    const acceptedRow = db.prepare("SELECT COUNT(*) as c FROM outreach_logs WHERE status = 'ACCEPTED'").get();
    const failedRow = db.prepare("SELECT COUNT(*) as c FROM outreach_logs WHERE status = 'FAILED'").get();
    const pendingRow = db.prepare("SELECT COUNT(*) as c FROM outreach_logs WHERE status = 'PENDING'").get();
    const processingRow = db.prepare("SELECT COUNT(*) as c FROM outreach_logs WHERE status = 'PROCESSING'").get();
    const unknownRow = db.prepare("SELECT COUNT(*) as c FROM outreach_logs WHERE status = 'UNKNOWN'").get();
    const dupBlockedRow = db.prepare("SELECT COUNT(*) as c FROM audit_logs WHERE action = 'OUTREACH_DUPLICATE_BLOCKED'").get();

    const stats = {
      total: totalRow?.c || 0,
      accepted: acceptedRow?.c || 0,
      failed: failedRow?.c || 0,
      pending: pendingRow?.c || 0,
      processing: processingRow?.c || 0,
      unknown: unknownRow?.c || 0,
      duplicates_blocked: dupBlockedRow?.c || 0,
    };

    const response = NextResponse.json(stats);
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Stats] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch statistics.' }, { status: 500 });
  }
}
