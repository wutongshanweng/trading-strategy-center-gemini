import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
  await db.execute(sql`DELETE FROM market_bars`);
  await db.execute(sql`DELETE FROM klines`);
  console.log('Cleared duplicates');
  process.exit(0);
}
run();
