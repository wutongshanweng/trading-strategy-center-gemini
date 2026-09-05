import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
import { dataEngine } from './src/services/dataEngine.js';

async function run() {
  await dataEngine.collectSymbolData('RB2610', '1d', 150);
  const mbRes = await db.execute(sql`SELECT count(*) FROM market_bars WHERE contract='RB2610' AND frequency IN ('1d', 'D1', 'd1')`);
  console.log('market_bars:', mbRes.rows);
  const klRes = await db.execute(sql`SELECT count(*) FROM klines WHERE symbol='RB2610' AND period IN ('1d', 'D1', 'd1')`);
  console.log('klines:', klRes.rows);
  process.exit(0);
}
run();
