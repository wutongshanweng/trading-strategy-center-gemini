import { pool } from './src/db/index.js';

async function test() {
  try {
    await pool.query(`TRUNCATE klines;`);
    console.log('Truncated klines!');
    const res = await pool.query(`SELECT pg_size_pretty(pg_database_size(current_database()))`);
    console.log('After DB Size:', res.rows[0]);
  } catch(e: any) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
test();
