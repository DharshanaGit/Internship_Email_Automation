import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'college_directory',
  user: 'college_bot',
  password: 'MySecurePass123!',
  options: '-c search_path=college_data,public',
});

async function queryPostgresColleges({ states = [], search = '', category = '', district = '', page = 1, limit = 50 }) {
  try {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (states.length > 0 && !states.includes('All India')) {
      const placeholders = states.map((_, i) => `$${params.length + i + 1}`).join(',');
      whereClause += ` AND c.state IN (${placeholders})`;
      params.push(...states);
    }

    const countQuery = `SELECT COUNT(*) AS total FROM colleges c ${whereClause};`;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);
    console.log(`Count result for states [${states.join(', ')}]: total = ${total}`);

    if (total === 0) return null;

    const offset = (page - 1) * limit;
    const queryParams = [...params, limit, offset];
    const limitPlaceholder = `$${queryParams.length - 1}`;
    const offsetPlaceholder = `$${queryParams.length}`;

    const collegesQuery = `
      SELECT 
        c.id, c.college_name, c.state AS state_or_region, c.district,
        c.category, c.website_url, c.phone, c.address, c.source
      FROM colleges c
      ${whereClause}
      ORDER BY c.college_name ASC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder};
    `;

    const collegesRes = await pool.query(collegesQuery, queryParams);
    const collegeRows = collegesRes.rows;
    console.log(`Colleges fetched: ${collegeRows.length}`);

    if (collegeRows.length > 0) {
      const collegeIds = collegeRows.map(c => c.id);
      const contactsRes = await pool.query(`
        SELECT 
          id, college_id, college_name, target_email AS email,
          role AS designation, role AS role_type, contact_person,
          phone, verification_status, dns_mx_verified
        FROM college_contacts
        WHERE college_id = ANY($1::uuid[])
        ORDER BY verification_status ASC;
      `, [collegeIds]);

      console.log(`Contacts fetched for colleges: ${contactsRes.rows.length}`);
    }

    return { total, colleges: collegeRows.length };
  } catch (err) {
    console.error("Query Error:", err);
    return null;
  }
}

async function test() {
  try {
    await queryPostgresColleges({ states: ['Assam'] });
    await queryPostgresColleges({ states: ['Andhra Pradesh'] });
    await queryPostgresColleges({ states: ['All India'] });
  } finally {
    await pool.end();
  }
}

test();
