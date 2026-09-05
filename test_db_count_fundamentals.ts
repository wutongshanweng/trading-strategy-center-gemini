import { pool } from './src/db/index.js';

async function test() {
  const counts = await pool.query(`SELECT count(*) FROM industry_fundamentals;`);
  console.log('industry_fundamentals:', counts.rows[0].count);
  const counts2 = await pool.query(`SELECT count(*) FROM macro_indicators;`);
  console.log('macro_indicators:', counts2.rows[0].count);
  process.exit(0);
}
test();
