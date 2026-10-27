import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { applySecurityHeaders } from '@/lib/security.js';

function getPgPool() {
  const pg = require('pg');
  const { Pool } = pg.default || pg;
  return new Pool({
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'college_directory',
    user: process.env.POSTGRES_USER || 'college_bot',
    password: process.env.POSTGRES_PASSWORD || 'MySecurePass123!',
    options: '-c search_path=college_data,public',
    connectionTimeoutMillis: 3000,
  });
}

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let pool;
  try {
    pool = getPgPool();

    // 1. Total counts
    const colRes = await pool.query('SELECT COUNT(*) as c FROM colleges;');
    const totalColleges = parseInt(colRes.rows[0]?.c || '0', 10);

    const ctRes = await pool.query('SELECT COUNT(*) as c, COUNT(*) filter (WHERE dns_mx_verified = TRUE) as mx FROM college_contacts;');
    const totalContacts = parseInt(ctRes.rows[0]?.c || '0', 10);
    const totalMxVerified = parseInt(ctRes.rows[0]?.mx || '0', 10);

    const auditCntRes = await pool.query('SELECT COUNT(*) as c FROM change_audit_logs;');
    const totalAudits = parseInt(auditCntRes.rows[0]?.c || '0', 10);

    // 2. Recent Audit Logs
    const auditsRes = await pool.query(`
      SELECT a.id, a.change_type, a.old_value, a.new_value, a.detected_at,
             c.college_name, c.state, c.district
      FROM change_audit_logs a
      LEFT JOIN colleges c ON a.college_id = c.id
      ORDER BY a.detected_at DESC
      LIMIT 15;
    `);

    // 3. Recent Crawl Jobs
    const jobsRes = await pool.query(`
      SELECT id, job_type, status, colleges_targeted, colleges_crawled, contacts_extracted,
             started_at, finished_at
      FROM crawl_jobs
      ORDER BY started_at DESC
      LIMIT 5;
    `);

    const lastSyncTime = jobsRes.rows[0]?.finished_at || auditsRes.rows[0]?.detected_at || new Date().toISOString();

    // Calculate next monthly sync date (1st of next month)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 3, 0, 0);

    const payload = {
      is_automation_active: true,
      last_sync: lastSyncTime,
      next_scheduled_sync: nextMonth.toISOString(),
      total_colleges: totalColleges,
      total_contacts: totalContacts,
      total_mx_verified: totalMxVerified,
      total_audit_events: totalAudits,
      recent_audits: auditsRes.rows,
      crawl_history: jobsRes.rows
    };

    const response = NextResponse.json(payload);
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Monitor] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch monitoring status' }, { status: 500 });
  } finally {
    if (pool) await pool.end();
  }
}
