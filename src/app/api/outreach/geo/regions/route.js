import { NextResponse } from 'next/server';
import { getGeoRegions } from '@/lib/db.js';
import { applySecurityHeaders } from '@/lib/security.js';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'college_directory',
  user: process.env.POSTGRES_USER || 'college_bot',
  password: process.env.POSTGRES_PASSWORD || 'MySecurePass123!',
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
  options: '-c search_path=college_data,public',
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || 'IN';

  try {
    if (country === 'IN') {
      try {
        const res = await pool.query(`
          SELECT 
            s.state_code as id,
            'IN' as country_code,
            s.state_name as name,
            'state' as type,
            COUNT(DISTINCT c.id)::int as college_count,
            COUNT(DISTINCT cc.id)::int as contact_count
          FROM states s
          LEFT JOIN colleges c ON c.state ILIKE s.state_name
          LEFT JOIN college_contacts cc ON cc.college_id = c.id
          GROUP BY s.state_code, s.state_name
          ORDER BY contact_count DESC, college_count DESC, s.state_name ASC;
        `);

        if (res.rowCount > 0) {
          const response = NextResponse.json({
            success: true,
            country,
            source: 'PostgreSQL',
            regions: res.rows
          });
          applySecurityHeaders(response.headers);
          return response;
        }
      } catch (pgError) {
        console.error('[API Geo Regions] PostgreSQL error, falling back to SQLite:', pgError.message);
      }
    }

    // Fallback to SQLite
    const regions = getGeoRegions(country);
    const response = NextResponse.json({ success: true, country, source: 'SQLite', regions });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Geo Regions] error:', err);
    return NextResponse.json({ error: 'Failed to load regions' }, { status: 500 });
  }
}
