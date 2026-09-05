import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
  const upperSymbol = 'RB2610';
  const freqSet = ['1d', 'D1', 'd1'];
  const queryLimit = 150;
  try {
    const mbRes = await db.execute(sql`
      SELECT id, contract as symbol, open, high, low, close, volume, open_interest, bar_start as created_at
      FROM market_bars
      WHERE contract = ${upperSymbol} AND frequency IN ${freqSet}
      ORDER BY bar_start DESC
      LIMIT ${queryLimit}
    `);
    console.log('mbRes rows:', mbRes.rows.length);
    if (mbRes.rows.length > 0) {
      console.log('first:', mbRes.rows[0]);
      console.log('last:', mbRes.rows[mbRes.rows.length - 1]);
    }
  } catch (e: any) {
    console.log('Error:', e.message);
  }
  process.exit(0);
}
run();
