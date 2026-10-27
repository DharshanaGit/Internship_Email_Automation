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

async function testRegions() {
  try {
    const res = await pool.query(`
      SELECT 
        s.state_code as id,
        'IN' as country_code,
        s.state_name as name,
        'state' as type,
        COUNT(DISTINCT c.id) as college_count,
        COUNT(DISTINCT cc.id) as contact_count
      FROM states s
      LEFT JOIN colleges c ON c.state ILIKE s.state_name
      LEFT JOIN college_contacts cc ON cc.college_id = c.id
      GROUP BY s.state_code, s.state_name
      ORDER BY contact_count DESC, college_count DESC, s.state_name ASC;
    `);

    console.log(`Fetched ${res.rowCount} states from PostgreSQL:`);
    res.rows.slice(0, 10).forEach(r => {
      console.log(` - ${r.name} (${r.id}): ${r.college_count} colleges, ${r.contact_count} contacts`);
    });
  } catch (err) {
    console.error("Regions Query Error:", err);
  } finally {
    await pool.end();
  }
}

testRegions();
