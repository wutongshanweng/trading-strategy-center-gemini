import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
  const mbRes = await db.execute(sql`
    SELECT DATE(bar_start) as dt, count(*) as cnt
    FROM market_bars
    WHERE contract = 'RB2610' AND frequency IN ('1d', 'D1', 'd1')
    GROUP BY DATE(bar_start)
    ORDER BY dt DESC
    LIMIT 10
  `);
  console.log(mbRes.rows);
  process.exit(0);
}
run();
