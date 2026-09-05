import express from 'express';
import { db } from './db/index.js';
import { users } from './db/schema.js';
import { ensureAllTables } from './db/initSchema.js';
import { apiRouter } from './api/index.js';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const app = express();
  app.use(express.json());

  // Ensure all database tables exist before taking requests
  try {
    await ensureAllTables();
  } catch (err: any) {
    console.warn('[Bootstrap] Auto schema init note:', err.message);
  }

  // API versioning root & base API mount
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  app.get('/api/health', async (req, res) => {
    try {
      const userCount = await db.select().from(users).limit(1);
      res.json({ 
        status: 'ok', 
        message: 'Node.js/TypeScript environment is ready.',
        db: 'connected'
      });
    } catch (err: any) {
      console.error('DB Health check failed:', err);
      res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed', 
        error: err.message 
      });
    }
  });

  // Setup Vite in middleware mode
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: false,
      ws: false
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`应用启动成功，监听端口 ${PORT}`);
    // 异步预加载 7 大核心品种基础规则、基本面并开启安全自动同步
    import('./services/sevenProductsEngine.js').then(({ sevenProductsEngine }) => {
      sevenProductsEngine.initSevenProductRules()
        .then(() => sevenProductsEngine.collectSevenFundamentals())
        .then(() => {
          sevenProductsEngine.startAutoSync(30);
        })
        .catch(err => console.error('7-Products auto init error:', err));
    }).catch(err => console.error('Failed to import sevenProductsEngine:', err));
  });
}

bootstrap().catch(console.error);
