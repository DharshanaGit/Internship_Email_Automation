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

async function testStateQuery() {
  try {
    const res = await pool.query(`
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
      LIMIT 5;
    `);

    console.log("Next.js PostgreSQL Connection Test Successful!");
    console.log(`Fetched ${res.rowCount} records directly from PostgreSQL:`);
    res.rows.forEach((r, i) => {
      console.log(` ${i+1}. [${r.role}] ${r.target_email} | ${r.college_name}`);
    });
  } catch (err) {
    console.error("Next.js PG Connection Error:", err);
  } finally {
    await pool.end();
  }
}

testStateQuery();
