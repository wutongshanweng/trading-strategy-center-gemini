import { pool } from './src/db/index.js';

async function test() {
  const columns = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'industry_fundamentals';
  `);
  console.log(columns.rows);
  process.exit(0);
}
test();
