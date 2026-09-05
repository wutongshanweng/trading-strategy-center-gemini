import { pool } from './src/db/index.js';

async function test() {
  const columns = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'macro_indicators';
  `);
  console.log('Macro columns:', columns.rows.map(r => r.column_name));
  process.exit(0);
}
test();
