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

async function testPostEndpoint() {
  const states = ['Assam'];
  const whereClause = 'WHERE c.state ILIKE $1';
  const params = ['%Assam%'];

  const countRes = await pool.query(`SELECT COUNT(*) AS total FROM colleges c ${whereClause};`, params);
  const total = parseInt(countRes.rows[0]?.total || '0', 10);
  console.log(`Total colleges in Assam: ${total}`);

  const collegesRes = await pool.query(`
    SELECT c.id, c.college_name, c.state AS state_or_region, c.district, c.website_url
    FROM colleges c
    ${whereClause}
    ORDER BY c.college_name ASC;
  `, params);

  const collegeIds = collegesRes.rows.map(c => c.id);
  const contactsRes = await pool.query(`
    SELECT id, college_id, target_email as email, role as designation, role as role_type, contact_person, phone
    FROM college_contacts
    WHERE college_id = ANY($1::uuid[]);
  `, [collegeIds]);

  console.log(`Colleges returned: ${collegesRes.rowCount}`);
  console.log(`Contacts returned: ${contactsRes.rowCount}`);

  const contacts = contactsRes.rows;
  console.log("Sample contact payload for UI:");
  console.log(contacts[0]);

  await pool.end();
}

testPostEndpoint();
