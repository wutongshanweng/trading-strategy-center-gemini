import { pool } from './src/db/index.js';

async function test() {
  try {
    const res = await pool.query('SELECT COUNT(*) FROM industry_fundamentals');
    console.log('Count:', res.rows[0].count);
    
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'industry_fundamentals';
    `);
    console.log('Columns:', columns.rows);
  } catch(e: any) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
test();
