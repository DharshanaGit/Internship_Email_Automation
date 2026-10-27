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

    // Query total colleges and verified contacts from PostgreSQL (fallback to SQLite)
    let totalColleges = 0;
    let verifiedContacts = 0;
    try {
      const pg = await import('pg');
      const { Pool } = pg.default || pg;
      const pool = new Pool({
        host: process.env.POSTGRES_HOST || '127.0.0.1',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        database: process.env.POSTGRES_DB || 'college_directory',
        user: process.env.POSTGRES_USER || 'college_bot',
        password: process.env.POSTGRES_PASSWORD || 'MySecurePass123!',
        options: '-c search_path=college_data,public',
        connectionTimeoutMillis: 2000,
      });
      const pgRes = await pool.query('SELECT COUNT(*) as c FROM colleges;');
      totalColleges = parseInt(pgRes.rows[0]?.c || '0', 10);

      const ctRes = await pool.query('SELECT COUNT(*) as c FROM college_contacts;');
      verifiedContacts = parseInt(ctRes.rows[0]?.c || '0', 10);
      await pool.end();
    } catch (pgErr) {
      try {
        const colRow = db.prepare('SELECT COUNT(*) as c FROM colleges').get();
        totalColleges = colRow?.c || 0;
        const ctRow = db.prepare('SELECT COUNT(*) as c FROM college_contacts').get();
        verifiedContacts = ctRow?.c || 0;
      } catch (sqErr) {}
    }

    const stats = {
      total: totalRow?.c || 0,
      accepted: acceptedRow?.c || 0,
      failed: failedRow?.c || 0,
      pending: pendingRow?.c || 0,
      processing: processingRow?.c || 0,
      unknown: unknownRow?.c || 0,
      duplicates_blocked: dupBlockedRow?.c || 0,
      total_colleges: totalColleges,
      verified_contacts: verifiedContacts,
    };

    const response = NextResponse.json(stats);
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Stats] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch statistics.' }, { status: 500 });
  }
}
