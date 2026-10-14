import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import { applySecurityHeaders } from '@/lib/security.js';

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  const query = searchParams.get('q') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

  const db = getDb();

  let sql = 'SELECT * FROM outreach_logs WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as count FROM outreach_logs WHERE 1=1';
  const params = [];
  const countParams = [];

  if (status !== 'all') {
    sql += ' AND status = ?';
    countSql += ' AND status = ?';
    params.push(status);
    countParams.push(status);
  }

  if (query.trim()) {
    const wild = `%${query.trim()}%`;
    sql += ' AND (college_name LIKE ? OR email LIKE ? OR department LIKE ?)';
    countSql += ' AND (college_name LIKE ? OR email LIKE ? OR department LIKE ?)';
    params.push(wild, wild, wild);
    countParams.push(wild, wild, wild);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  try {
    const totalRow = db.prepare(countSql).get(...countParams);
    const total = totalRow ? totalRow.count : 0;
    const records = db.prepare(sql).all(...params);

    const response = NextResponse.json({
      total,
      limit,
      offset,
      records,
    });

    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Logs] Query error:', err);
    return NextResponse.json({ error: 'Failed to retrieve outreach logs.' }, { status: 500 });
  }
}
