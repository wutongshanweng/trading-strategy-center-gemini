import { pool } from './src/db/index.js';

async function test() {
  try {
    await pool.query(`DROP TABLE IF EXISTS industry_fundamentals CASCADE;`);
    await pool.query(`
      CREATE TABLE industry_fundamentals (
        id BIGSERIAL PRIMARY KEY,
        product VARCHAR(20) NOT NULL,
        indicator_code VARCHAR(60) NOT NULL,
        indicator_name VARCHAR(100) NOT NULL,
        observation_date DATE NOT NULL,
        publication_time TIMESTAMPTZ NOT NULL,
        available_at TIMESTAMPTZ NOT NULL,
        value DOUBLE PRECISION NOT NULL,
        unit VARCHAR(30) NOT NULL,
        region VARCHAR(50),
        frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
        revision_id VARCHAR(30) NOT NULL DEFAULT 'rev-01',
        source_name VARCHAR(100) NOT NULL,
        source_url TEXT NOT NULL DEFAULT '',
        source_sha256 VARCHAR(64) NOT NULL DEFAULT '',
        official BOOLEAN NOT NULL DEFAULT TRUE,
        effective_dated BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Done!');
  } catch(e: any) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
test();
