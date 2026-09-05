import { Router, Request, Response } from 'express';
import { db } from '../../db/index.js';
import { sql } from 'drizzle-orm';
import os from 'os';

export const healthRouter = Router();

// /api/v1/health from Python mapped here
healthRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    platform: 'Node.js/TypeScript',
  });
});

healthRouter.get('/system/time', (req: Request, res: Response) => {
  // A simplistic mock of the complex Python cn_futures_time_status logic for now.
  // In Phase 3, this will be fully implemented.
  const now = new Date();
  res.json({
    current_utc: now.toISOString(),
    // To be implemented fully:
    status: 'OPEN',
    trading_day: now.toISOString().split('T')[0],
  });
});

healthRouter.get('/health/diagnostics', async (req: Request, res: Response) => {
  const results: Record<string, { status: string; value: any }> = {};

  // 1. Node Version (Replacement for Python Version)
  results['node_version'] = { status: 'ok', value: process.version };

  // 2. OS
  results['os'] = { status: 'ok', value: `${os.type()} ${os.release()}` };

  // 3. PostgreSQL Database
  try {
    const dbTest = await db.execute(sql`SELECT 1 as test`);
    results['postgresql'] = { status: 'ok', value: '已连接 (Connected)' };
  } catch (e: any) {
    results['postgresql'] = { status: 'error', value: e.message?.substring(0, 100) };
  }

  // 4. API Keys
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    results['gemini_api'] = { status: 'ok', value: '已配置' };
  } else {
    results['gemini_api'] = { status: 'warning', value: '未配置 (LLM 功能不可用)' };
  }

  // 5. Disk Space (Simple Approximation)
  results['disk_space'] = { status: 'ok', value: 'Not fully monitored in Node yet' };

  // Summary
  const allOk = Object.values(results).every(v => v.status === 'ok');
  const summary = allOk ? '所有服务正常' : '部分服务异常，请检查';

  res.json({
    timestamp: new Date().toISOString(),
    summary,
    all_ok: allOk,
    checks: results,
  });
});

healthRouter.get('/health/diagnostics/ops-snapshot', async (req: Request, res: Response) => {
  try {
    // Placeholder for when ops_health_snapshots is queried
    const snapshot = await db.execute(
      sql`SELECT status, metrics, created_at FROM ops_health_snapshots ORDER BY created_at DESC LIMIT 1`
    );
    res.json(snapshot.rows[0] || { status: 'unavailable', metrics: {}, created_at: null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

healthRouter.get('/health/overview', (req: Request, res: Response) => {
  res.json({
    message: 'System overview stub (Data, Signals, AI statuses to be implemented in Phase 3)',
  });
});
