import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const freqSet = ['1d', 'D1', 'd1'];
    const res = await db.execute(sql`SELECT count(*) FROM market_bars WHERE contract='RB2610' AND frequency IN ${freqSet}`);
    console.log('Success:', res.rows);
  } catch (err: any) {
    console.log('Error:', err.message);
  }
  process.exit(0);
}
run();
