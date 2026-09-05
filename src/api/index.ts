import { Router } from 'express';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { intelligenceRouter } from './routes/intelligence.js';
import { dataRouter } from './routes/data.js';
import { backtestRouter } from './routes/backtest.js';
import { modulesRouter } from './routes/modules.js';
import { strategiesRouter } from './routes/strategies.js';
import { factorsRouter } from './routes/factors.js';
import { warehouseRouter } from './routes/warehouse.js';
import { newsRouter } from './routes/news.js';
import { llmRouter } from './routes/llm.js';

export const apiRouter = Router();

apiRouter.use('/', healthRouter); // Mounts /health, /system/time etc.
apiRouter.use('/auth', authRouter); // Mounts /auth/me
apiRouter.use('/intelligence', intelligenceRouter); // Mounts /intelligence/briefing
apiRouter.use('/data', dataRouter); // Mounts /data/*
apiRouter.use('/backtest', backtestRouter); // Mounts /backtest/*
apiRouter.use('/modules', modulesRouter); // Mounts /modules/* (industry, factors, positions)
apiRouter.use('/strategies', strategiesRouter); // Mounts /strategies/*
apiRouter.use('/factor', factorsRouter); // Mounts /factor/*
apiRouter.use('/factors', factorsRouter); // Mounts /factors/* (alias)
apiRouter.use('/warehouse', warehouseRouter); // Mounts /warehouse/* (symbols, inventory)
apiRouter.use('/data/warehouse', warehouseRouter); // Alias
apiRouter.use('/macro-news', newsRouter); // Mounts /macro-news/* (dashboard, news)
apiRouter.use('/briefing', newsRouter); // Mounts /briefing/*
apiRouter.use('/news', newsRouter); // Mounts /news/*
apiRouter.use('/llm', llmRouter); // Mounts /llm/* (providers, use-cases, tasks)
