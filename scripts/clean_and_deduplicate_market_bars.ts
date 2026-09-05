import { pool } from '../src/db/index.js';

async function run() {
  console.log('=== Starting In-Memory Safe Market Bars Deduplication ===');
  const client = await pool.connect();
  try {
    const productsRes = await client.query('SELECT DISTINCT product FROM market_bars');
    const products = productsRes.rows.map((r: any) => r.product).filter(Boolean);
    console.log(`Found ${products.length} products to deduplicate:`, products);

    const cleanRows: any[] = [];

    for (const prod of products) {
      console.log(`Extracting clean rows for product [${prod}]...`);
      // 1. Clean D1
      const d1Res = await client.query(`
        SELECT DISTINCT ON (symbol, frequency, trading_date) 
          exchange, product, contract, symbol, frequency, trading_date, 
          COALESCE(bar_start, bar_time) as bar_start,
          COALESCE(bar_end, bar_time) as bar_end,
          COALESCE(bar_start, bar_time) as bar_time,
          session, open, high, low, close, volume, open_interest, turnover,
          settlement, pre_settlement, pre_close, upper_limit, lower_limit,
          source_count, expected_count, missing_count, is_finalized,
          quality_status, roll_transition, source_id, source_sha256, schema_version
        FROM market_bars
        WHERE product = $1 AND frequency = 'D1'
        ORDER BY symbol, frequency, trading_date, id DESC
      `, [prod]);
      console.log(`  -> ${prod} D1 clean rows: ${d1Res.rows.length}`);
      cleanRows.push(...d1Res.rows);

      // 2. Clean Intraday
      const intraRes = await client.query(`
        SELECT DISTINCT ON (symbol, frequency, trading_date, session) 
          exchange, product, contract, symbol, frequency, trading_date, 
          COALESCE(bar_start, bar_time) as bar_start,
          COALESCE(bar_end, bar_time) as bar_end,
          COALESCE(bar_start, bar_time) as bar_time,
          session, open, high, low, close, volume, open_interest, turnover,
          settlement, pre_settlement, pre_close, upper_limit, lower_limit,
          source_count, expected_count, missing_count, is_finalized,
          quality_status, roll_transition, source_id, source_sha256, schema_version
        FROM market_bars
        WHERE product = $1 AND frequency != 'D1'
        ORDER BY symbol, frequency, trading_date, session, id DESC
      `, [prod]);
      console.log(`  -> ${prod} Intraday clean rows: ${intraRes.rows.length}`);
      cleanRows.push(...intraRes.rows);
    }

    console.log(`Total clean rows held in memory: ${cleanRows.length}`);

    if (cleanRows.length === 0) {
      console.warn('No clean rows extracted, aborting truncate.');
      return;
    }

    console.log('3. Truncating market_bars table to immediately reclaim disk space...');
    await client.query('TRUNCATE TABLE market_bars RESTART IDENTITY;');
    console.log('Truncated successfully. Disk space reclaimed.');

    console.log('4. Dropping old flawed index on bar_time...');
    await client.query(`DROP INDEX IF EXISTS uniq_symbol_freq_time;`);
    await client.query(`DROP INDEX IF EXISTS uniq_market_bars_d1;`);
    await client.query(`DROP INDEX IF EXISTS uniq_market_bars_intraday;`);

    console.log(`5. Re-inserting ${cleanRows.length} clean rows in batches of 100...`);
    const batchSize = 100;
    const cols = [
      'exchange', 'product', 'contract', 'symbol', 'frequency', 'trading_date',
      'bar_start', 'bar_end', 'bar_time', 'session', 'open', 'high', 'low', 'close',
      'volume', 'open_interest', 'turnover', 'settlement', 'pre_settlement', 'pre_close',
      'upper_limit', 'lower_limit', 'source_count', 'expected_count', 'missing_count',
      'is_finalized', 'quality_status', 'roll_transition', 'source_id', 'source_sha256',
      'schema_version'
    ];

    for (let i = 0; i < cleanRows.length; i += batchSize) {
      const chunk = cleanRows.slice(i, i + batchSize);
      const valueStrings: string[] = [];
      const params: any[] = [];

      chunk.forEach((row, rIdx) => {
        const offset = rIdx * cols.length;
        const placeholders = cols.map((_, cIdx) => `$${offset + cIdx + 1}`).join(', ');
        valueStrings.push(`(${placeholders})`);
        cols.forEach(col => {
          params.push(row[col] ?? null);
        });
      });

      const sqlInsert = `
        INSERT INTO market_bars (${cols.join(', ')})
        VALUES ${valueStrings.join(', ')}
      `;
      await client.query(sqlInsert, params);

      if ((i + batchSize) % 2000 === 0 || i + batchSize >= cleanRows.length) {
        console.log(`  -> Inserted ${Math.min(i + batchSize, cleanRows.length)} / ${cleanRows.length} rows...`);
      }
    }

    console.log('6. Building proper UNIQUE indexes...');
    await client.query(`
      CREATE UNIQUE INDEX uniq_market_bars_d1 
      ON market_bars (symbol, frequency, trading_date) 
      WHERE frequency = 'D1';
    `);

    await client.query(`
      CREATE UNIQUE INDEX uniq_market_bars_intraday 
      ON market_bars (symbol, frequency, bar_start) 
      WHERE frequency != 'D1';
    `);

    console.log('7. Running VACUUM ANALYZE...');
    await client.query('VACUUM ANALYZE market_bars;');

    const finalCount = await client.query('SELECT count(*) FROM market_bars');
    const finalSize = await client.query(`
      SELECT pg_size_pretty(pg_total_relation_size('market_bars')) as table_size
    `);
    console.log(`[Final Result] market_bars rows: ${finalCount.rows[0].count}, table size: ${finalSize.rows[0].table_size}`);
    console.log('=== In-Memory Deduplication Completed Successfully! ===');
  } catch (err: any) {
    console.error('Deduplication failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
