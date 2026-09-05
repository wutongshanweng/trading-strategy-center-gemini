import { Router, Request, Response } from 'express';
import { industryFundamentalsService } from '../../services/industryFundamentalsService.js';
import { factorEngine } from '../../services/factorEngine.js';
import { positionAlertEngine } from '../../services/positionAlertEngine.js';
import { decisionEngine } from '../../services/decisionEngine.js';

export const modulesRouter = Router();

// ==========================================
// 1. 产业链与基本面子系统 API
// ==========================================
modulesRouter.get('/industry/profile', async (req: Request, res: Response) => {
  try {
    const { product } = req.query;
    const profile = await industryFundamentalsService.getProductIndustryProfile(product as string);
    res.json({ status: 'ok', data: profile });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

modulesRouter.get('/industry/cross-matrix', async (req: Request, res: Response) => {
  try {
    const matrix = await industryFundamentalsService.getCrossProductFundamentalMatrix();
    res.json({ status: 'ok', data: matrix });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

modulesRouter.post('/industry/sync-receipts', async (req: Request, res: Response) => {
  try {
    const { product = 'RU' } = req.body;
    const result = await industryFundamentalsService.syncReceiptsAndRankings(product);
    res.json({ status: 'ok', data: result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// 2. 量化因子与特征工程子系统 API
// ==========================================
modulesRouter.get('/factors/compute', async (req: Request, res: Response) => {
  try {
    const { symbol = 'RB2610', frequency = 'H1' } = req.query;
    const result = await factorEngine.computeFactorsForSymbol(symbol as string, frequency as any);
    res.json({ status: 'ok', data: result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

modulesRouter.get('/factors/cross-ranking', async (req: Request, res: Response) => {
  try {
    const { frequency = 'D1' } = req.query;
    const ranking = await factorEngine.getCrossSectionalRanking(frequency as any);
    res.json({ status: 'ok', data: ranking });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// 3. 人工持仓与出场风控子系统 API
// ==========================================
modulesRouter.get('/positions/active', async (req: Request, res: Response) => {
  try {
    const data = await positionAlertEngine.getActivePositionsWithAlerts();
    res.json({ status: 'ok', data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

modulesRouter.post('/positions/create', async (req: Request, res: Response) => {
  try {
    const result = await positionAlertEngine.createManualPosition(req.body);
    res.json({ status: 'ok', data: result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

modulesRouter.post('/positions/close', async (req: Request, res: Response) => {
  try {
    const { positionId, exitPrice } = req.body;
    const result = await positionAlertEngine.closePosition(positionId, parseFloat(exitPrice));
    res.json({ status: 'ok', data: result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// 4. 多周期决策与风控计算 API
// ==========================================
modulesRouter.get('/decision/evaluate', async (req: Request, res: Response) => {
  try {
    const { symbol = 'RB2610', capital = '100000' } = req.query;
    const result = await decisionEngine.generateDecision(symbol as string, parseFloat(capital as string));
    res.json({ status: 'ok', data: result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

