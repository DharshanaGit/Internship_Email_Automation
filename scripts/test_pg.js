import pg from 'pg';
const pool = new pg.Pool({
  host: '127.0.0.1', port: 5432, database: 'college_directory', user: 'college_bot', password: 'MySecurePass123!',
  options: '-c search_path=college_data,public'
});

async function inspect() {
  const cCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='college_data' AND table_name='colleges';");
  console.log('colleges columns:', cCols.rows.map(r => `${r.column_name}: ${r.data_type}`));
  
  const ctCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='college_data' AND table_name='college_contacts';");
  console.log('contacts columns:', ctCols.rows.map(r => `${r.column_name}: ${r.data_type}`));
  
  const cSample = await pool.query('SELECT id FROM colleges LIMIT 3;');
  console.log('colleges sample ids:', cSample.rows);
  
  // Test query
  const ids = cSample.rows.map(r => r.id);
  console.log('ids array:', ids);
  try {
    const q1 = await pool.query('SELECT * FROM college_contacts WHERE college_id = ANY($1::text[])', [ids]);
    console.log('q1 with $1::text[] succeeded:', q1.rows.length);
  } catch (e) {
    console.log('q1 failed:', e.message);
  }

  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const q2 = await pool.query(`SELECT * FROM college_contacts WHERE college_id IN (${placeholders})`, ids);
    console.log('q2 with IN succeeded:', q2.rows.length);
  } catch (e) {
    console.log('q2 failed:', e.message);
  }
}

inspect();
