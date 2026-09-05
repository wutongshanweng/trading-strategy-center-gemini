import { Router, Request, Response } from 'express';
import { backtestEngine, AVAILABLE_STRATEGIES } from '../../services/backtestEngine.js';

export const backtestRouter = Router();

// GET /api/v1/backtest/strategies - List all available strategies
backtestRouter.get('/strategies', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    data: AVAILABLE_STRATEGIES
  });
});

// POST /api/v1/backtest/run - Execute backtest
backtestRouter.post('/run', async (req: Request, res: Response) => {
  try {
    const { strategyId, symbol, initialCapital, params } = req.body;

    if (!strategyId || !symbol) {
      res.status(400).json({ error: 'Missing strategyId or symbol' });
      return;
    }

    const result = await backtestEngine.runBacktest({
      strategyId,
      symbol,
      initialCapital: initialCapital ? Number(initialCapital) : 100000,
      params: params || {},
      saveResult: true
    });

    res.json({
      status: 'ok',
      data: result
    });
  } catch (error: any) {
    console.error('Backtest error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/backtest/history - Query saved backtest runs
backtestRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await backtestEngine.getBacktestHistory(limit);
    res.json({
      status: 'ok',
      data: history
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/backtest/quick - Fast backtest simulation
backtestRouter.get('/quick', async (req: Request, res: Response) => {
  try {
    const strategyName = (req.query.strategy_name as string) || 'DualMA';
    const symbol = (req.query.symbol as string) || 'RB';

    const result = await backtestEngine.runBacktest({
      strategyId: strategyName,
      symbol,
      initialCapital: 100000,
      saveResult: false
    });

    res.json({
      status: 'ok',
      strategy_name: strategyName,
      symbol,
      summary: {
        total_return: result.metrics.totalReturn,
        sharpe: result.metrics.sharpeRatio,
        max_drawdown: result.metrics.maxDrawdown,
        win_rate: result.metrics.winRate,
        total_trades: result.metrics.totalTrades,
        score: result.metrics.score,
        grade: result.metrics.grade
      },
      equity_curve: result.equityCurve,
      trades: result.trades.slice(0, 50)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/backtest/tournament - Run strategy tournament
backtestRouter.post('/tournament', async (req: Request, res: Response) => {
  try {
    const symbol = (req.body.symbol as string) || 'IF2606';
    const tournament = await backtestEngine.runTournament(symbol);
    res.json({
      status: 'ok',
      symbol,
      data: tournament
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
