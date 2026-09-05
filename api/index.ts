import express, { Request, Response, NextFunction } from 'express';
import { dataRouter } from '../src/api/routes/data.js';
import { apiRouter } from '../src/api/index.js';
import { ensureAllTables } from '../src/db/initSchema.js';

const app = express();

// Simple zero-dependency CORS middleware for serverless
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Auto ensure all DB tables exist asynchronously without blocking request pipeline
let schemaInitialized = false;
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!schemaInitialized) {
    schemaInitialized = true;
    ensureAllTables().catch((e) => {
      console.warn('[DB] Auto schema init background note:', e.message);
    });
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Mount routers to support both full (/api/v1, /api) and stripped (/v1, /) paths on Vercel Serverless
app.use('/api/v1', apiRouter);
app.use('/v1', apiRouter);
app.use('/api', apiRouter);
app.use('/', (req: Request, res: Response, next: NextFunction) => {
  // If request begins with /api/v1 or /v1 or subpaths, dispatch to apiRouter
  if (req.url.startsWith('/data') || req.url.startsWith('/intelligence') || req.url.startsWith('/backtest') || req.url.startsWith('/modules') || req.url.startsWith('/auth')) {
    return apiRouter(req, res, next);
  }
  return apiRouter(req, res, next);
});

app.get('/api/health', async (req: Request, res: Response) => {
  let dbStatus = 'unconfigured';
  let dbError = null;
  const hasDbUrl = Boolean(process.env.DATABASE_URL);

  if (hasDbUrl) {
    try {
      const { pool } = await import('../src/db/index.js');
      const start = Date.now();
      const result = await pool.query('SELECT 1 as connected');
      const latencyMs = Date.now() - start;
      dbStatus = result.rows?.[0]?.connected === 1 ? `connected (${latencyMs}ms)` : 'unexpected_response';
    } catch (e: any) {
      dbStatus = 'connection_failed';
      dbError = e.message;
    }
  }

  res.json({
    status: dbError ? 'warning' : 'ok',
    mode: 'vercel_serverless',
    database: {
      has_database_url: hasDbUrl,
      status: dbStatus,
      error: dbError
    },
    timestamp: new Date().toISOString()
  });
});

// Global fallback JSON error handler to prevent Vercel HTML 500 error pages
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Vercel Serverless Error Handler]:', err);
  res.status(500).json({
    status: 'error',
    error: err?.message || 'Server Internal Error',
    type: err?.name || 'Error'
  });
});

export default app;
