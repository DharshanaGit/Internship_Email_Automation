import { NextResponse } from 'next/server';
import { applySecurityHeaders } from '@/lib/security.js';
import pg from 'pg';

const { Pool } = pg;

// PostgreSQL Connection Pool
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
  const state = searchParams.get('state');
  const role = searchParams.get('role');
  const limit = Math.min(2000, Math.max(1, parseInt(searchParams.get('limit') || '500', 10)));

  if (!state) {
    return NextResponse.json({ error: 'Missing required query parameter: state' }, { status: 400 });
  }

  try {
    let query = `
      SELECT 
        c.college_name,
        cc.target_email,
        cc.role,
        COALESCE(cc.district_location, c.district || ', ' || c.state) AS district_location,
        COALESCE(cc.contact_person, 'Leadership Office') AS contact_person,
        COALESCE(cc.phone, c.phone, '') AS phone,
        cc.verification_status,
        cc.dns_mx_verified
      FROM college_contacts cc
      JOIN colleges c ON cc.college_id = c.id
      WHERE c.state ILIKE $1
    `;
    const params = [`%${state}%`];

    if (role && role !== 'ALL') {
      query += ` AND cc.role ILIKE $2`;
      params.push(`%${role}%`);
    }

    query += ` ORDER BY c.college_name ASC LIMIT $${params.length + 1};`;
    params.push(limit);

    const result = await pool.query(query, params);

    const response = NextResponse.json({
      success: true,
      source: 'PostgreSQL',
      state,
      total: result.rowCount,
      contacts: result.rows.map(row => ({
        college_name: row.college_name,
        email: row.target_email,
        target_email: row.target_email,
        role: row.role,
        district_location: row.district_location,
        contact_person: row.contact_person,
        phone: row.phone,
        status: row.verification_status,
        dns_mx_verified: row.dns_mx_verified
      }))
    });

    applySecurityHeaders(response.headers);
    return response;
  } catch (pgError) {
    console.error('[API State-Contacts] PostgreSQL Query error:', pgError.message);
    
    // Graceful fallback to existing geo colleges database if PG table is currently populating
    try {
      const { getGeoColleges } = await import('@/lib/db.js');
      const fallbackResult = getGeoColleges({ states: [state], limit });
      
      const response = NextResponse.json({
        success: true,
        source: 'StorageEngine',
        state,
        total: fallbackResult.contacts ? fallbackResult.contacts.length : 0,
        contacts: (fallbackResult.contacts || []).map(c => ({
          college_name: c.college_name || c.name,
          email: c.email || c.target_email,
          target_email: c.email || c.target_email,
          role: c.designation || c.role_type || 'Leadership Office',
          district_location: c.district || state,
          contact_person: c.contact_person || 'Office',
          phone: c.phone || '',
          status: 'VERIFIED'
        }))
      });
      applySecurityHeaders(response.headers);
      return response;
    } catch (fallbackError) {
      return NextResponse.json({ error: 'Failed to query state contacts', details: pgError.message }, { status: 500 });
    }
  }
}
