import { pool } from './src/db/index.js';

async function test() {
  try {
    const counts = await pool.query(`SELECT frequency, count(*) FROM market_bars GROUP BY frequency`);
    console.log('market_bars counts:', counts.rows);
    const counts2 = await pool.query(`SELECT period, count(*) FROM klines GROUP BY period`);
    console.log('klines counts:', counts2.rows);
  } catch(e: any) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
test();
