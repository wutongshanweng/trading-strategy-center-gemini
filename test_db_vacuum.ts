import { pool } from './src/db/index.js';
async function test() {
  try {
    const res = await pool.query(`SELECT pg_size_pretty(pg_database_size(current_database()))`);
    console.log('Before DB Size:', res.rows[0]);
    // await pool.query(`VACUUM FULL`); // Neon doesn't always support VACUUM FULL nicely
  } catch(e: any) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
test();
