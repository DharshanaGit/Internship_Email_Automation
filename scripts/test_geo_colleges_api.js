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

async function testStateFetch(stateName) {
  console.log(`\n=== Testing State Trigger: '${stateName}' ===`);
  const collegesRes = await pool.query(
    'SELECT id, college_name, state, district, website_url FROM colleges WHERE state ILIKE $1 LIMIT 5;',
    [`%${stateName}%`]
  );
  
  console.log(`Found ${collegesRes.rowCount} colleges for '${stateName}':`);
  collegesRes.rows.forEach(c => console.log(` - ${c.college_name} (${c.website_url})`));

  if (collegesRes.rows.length > 0) {
    const ids = collegesRes.rows.map(c => c.id);
    const contactsRes = await pool.query(
      'SELECT college_id, target_email, role, contact_person, phone, dns_mx_verified FROM college_contacts WHERE college_id = ANY($1);',
      [ids]
    );
    console.log(`Found ${contactsRes.rowCount} verified contacts linked to these colleges:`);
    contactsRes.rows.forEach(ct => {
      console.log(`   [${ct.role}] ${ct.target_email} | Person: ${ct.contact_person || 'N/A'} | MX Verified: ${ct.dns_mx_verified}`);
    });
  }
}

async function run() {
  try {
    await testStateFetch('Assam');
    await testStateFetch('Andhra Pradesh');
  } finally {
    await pool.end();
  }
}

run();
