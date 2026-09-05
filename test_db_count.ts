import { pool } from './src/db/index.js';

async function test() {
  try {
    const res = await pool.query(`SELECT count(*) FROM market_bars;`);
    console.log('market_bars count:', res.rows[0].count);
    const res2 = await pool.query(`SELECT count(*) FROM klines;`);
    console.log('klines count:', res2.rows[0].count);
  } catch(e: any) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
test();
