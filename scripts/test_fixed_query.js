import pg from 'pg';

const pool = new pg.Pool({
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
      const stateConditions = states.map((_, i) => `c.state ILIKE $${params.length + i + 1}`).join(' OR ');
      whereClause += ` AND (${stateConditions})`;
      params.push(...states.map(s => `%${s.trim()}%`));
    }

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      whereClause += ` AND (c.college_name ILIKE $${params.length} OR c.district ILIKE $${params.length} OR c.website_url ILIKE $${params.length})`;
    }

    if (category && category !== 'all') {
      params.push(`%${category}%`);
      whereClause += ` AND c.category ILIKE $${params.length}`;
    }

    if (district && district !== 'all') {
      params.push(`%${district}%`);
      whereClause += ` AND c.district ILIKE $${params.length}`;
    }

    const countQuery = `SELECT COUNT(*) AS total FROM colleges c ${whereClause};`;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    if (total === 0) {
      return { colleges: [], total: 0, page, limit, totalPages: 0, source: 'PostgreSQL' };
    }

    const offset = (page - 1) * limit;
    params.push(limit, offset);
    const collegesQuery = `
      SELECT 
        c.id, c.college_name, c.state AS state_or_region, c.district,
        c.category, c.website_url, c.phone, c.address, c.source
      FROM colleges c
      ${whereClause}
      ORDER BY 
        (CASE WHEN EXISTS (SELECT 1 FROM college_contacts ct WHERE ct.college_id = c.id) THEN 0 ELSE 1 END),
        c.college_name ASC
      LIMIT $${params.length - 1} OFFSET $${params.length};
    `;

    const collegesRes = await pool.query(collegesQuery, params);
    const collegeRows = collegesRes.rows;

    if (collegeRows.length > 0) {
      const collegeIds = collegeRows.map(c => c.id);
      const placeholders = collegeIds.map((_, i) => `$${i + 1}`).join(',');
      const contactsRes = await pool.query(`
        SELECT 
          id, college_id, college_name, target_email AS email,
          role AS designation, role AS role_type, contact_person,
          phone, verification_status, dns_mx_verified
        FROM college_contacts
        WHERE college_id IN (${placeholders})
        ORDER BY verification_status ASC;
      `, collegeIds);

      const contactMap = {};
      for (const ct of contactsRes.rows) {
        if (!contactMap[ct.college_id]) contactMap[ct.college_id] = [];
        let person = (ct.contact_person || '').trim();
        if (!person || person.toLowerCase() === 'nan' || person.toLowerCase() === 'null') {
          person = ct.designation || 'Leadership Office';
        }
        contactMap[ct.college_id].push({
          id: ct.id,
          college_id: ct.college_id,
          contact_person: person,
          designation: ct.designation || 'Academic Leadership',
          email: ct.email,
          phone: (ct.phone && ct.phone.toLowerCase() !== 'nan') ? ct.phone : '',
          role_type: ct.role_type || 'Leadership',
          is_primary: 1,
          dns_mx_verified: ct.dns_mx_verified
        });
      }

      for (const clg of collegeRows) {
        clg.country_code = 'IN';
        clg.country_name = 'India';
        clg.contacts = contactMap[clg.id] || [];
        clg.all_available_emails = clg.contacts.map(c => c.email);
        clg.primary_email = clg.contacts[0]?.email || '';
      }
    }

    return {
      colleges: collegeRows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      source: 'PostgreSQL'
    };
  } catch (err) {
    console.error('[PostgreSQL Colleges Query] Error:', err);
    return null;
  }
}

async function run() {
  for (const st of ['Tamil Nadu', 'Delhi', 'Karnataka', 'Maharashtra', 'Uttar Pradesh', 'Goa']) {
    const res = await queryPostgresColleges({ states: [st], limit: 50 });
    const withContacts = res ? res.colleges.filter(c => c.contacts.length > 0).length : 0;
    console.log(`State: ${st} -> Total: ${res?.total}, Fetched: ${res?.colleges.length}, With Contacts: ${withContacts}`);
  }
  await pool.end();
}

run();
