import { Router, Request, Response } from 'express';
import { quantRegistry } from '../../services/quantRegistry.js';
import { strategyTuner } from '../../services/strategyTuner.js';

export const strategiesRouter = Router();

// GET /api/v1/strategies/catalog/grouped
strategiesRouter.get('/catalog/grouped', (req: Request, res: Response) => {
  const data = quantRegistry.getGroupedStrategies();
  res.json(data);
});

// GET /api/v1/strategies/catalog
strategiesRouter.get('/catalog', (req: Request, res: Response) => {
  const { type, regime, active_only } = req.query;
  const data = quantRegistry.getStrategyCatalog({
    type: type as string,
    regime: regime as string,
    active_only: active_only === 'true'
  });
  res.json(data);
});

// GET /api/v1/strategies/pool
strategiesRouter.get('/pool', (req: Request, res: Response) => {
  const data = quantRegistry.getStrategyPool();
  res.json(data);
});

// GET /api/v1/strategies/pool/degradation
strategiesRouter.get('/pool/degradation', (req: Request, res: Response) => {
  const data = quantRegistry.getStrategyDegradation();
  res.json(data);
});

// GET /api/v1/strategies/pool/whitelist
strategiesRouter.get('/pool/whitelist', (req: Request, res: Response) => {
  const list = quantRegistry.getWhitelist();
  res.json({ count: list.length, strategies: list });
});

// POST /api/v1/strategies/pool/whitelist
strategiesRouter.post('/pool/whitelist', (req: Request, res: Response) => {
  const { strategy_names = [] } = req.body;
  const list = quantRegistry.addToWhitelist(strategy_names);
  res.json({ status: 'ok', strategies: list });
});

// DELETE /api/v1/strategies/pool/whitelist/:name
strategiesRouter.delete('/pool/whitelist/:name', (req: Request, res: Response) => {
  const list = quantRegistry.removeFromWhitelist(String(req.params.name));
  res.json({ status: 'ok', strategies: list });
});

// POST /api/v1/strategies/pool/optimize
strategiesRouter.post('/pool/optimize', (req: Request, res: Response) => {
  const { strategy_name = 'trend_ma_cross', n_iter = 15, product = 'RB', method = 'bayesian' } = req.body;
  const tuneResult = strategyTuner.autoTuneStrategy({
    strategyName: String(strategy_name),
    symbol: product,
    method: method === 'grid' ? 'grid' : 'bayesian',
    nIter: Number(n_iter) || 15
  });
  res.json({
    status: 'ok',
    ok: true,
    strategy_name,
    product,
    best_params: tuneResult.best_params,
    best_score: tuneResult.is_metrics.sharpe_ratio,
    best_sharpe: tuneResult.is_metrics.sharpe_ratio,
    baseline_sharpe: tuneResult.baseline_metrics.sharpe_ratio,
    iterations_run: tuneResult.iterations_run,
    tune_result: tuneResult
  });
});

// POST /api/v1/strategies/portfolio-backtest
strategiesRouter.post('/portfolio-backtest', (req: Request, res: Response) => {
  try {
    const { strategies = [], symbol = 'RB', allocation_method = 'equal_weight', capital = 100000 } = req.body;
    const result = strategyTuner.runPortfolioBacktest({
      strategies,
      symbol,
      allocationMethod: allocation_method,
      capital: Number(capital) || 100000
    });
    res.json({ status: 'ok', data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/strategies/compare
strategiesRouter.post('/compare', (req: Request, res: Response) => {
  try {
    const { names = [] } = req.body;
    const result = strategyTuner.compareStrategies(names);
    res.json({ status: 'ok', data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/strategies/:name/auto-tune
strategiesRouter.post('/:name/auto-tune', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const {
      symbol = 'RB',
      method = 'bayesian',
      objective = 'sharpe',
      n_iter = 20,
      split_ratio = 0.7
    } = req.body;

    const result = strategyTuner.autoTuneStrategy({
      strategyName: String(name),
      symbol,
      method: method === 'grid' ? 'grid' : 'bayesian',
      objective,
      nIter: Number(n_iter) || 20,
      splitRatio: Number(split_ratio) || 0.7
    });

    res.json({ status: 'ok', data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/strategies/:name/apply-params
strategiesRouter.post('/:name/apply-params', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { params } = req.body;
    const updated = quantRegistry.updateStrategyParams(String(name), params || {});
    if (!updated) {
      res.status(404).json({ error: 'Strategy not found' });
      return;
    }
    res.json({ status: 'ok', strategy: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/strategies/pool/:name/retire
strategiesRouter.post('/pool/:name/retire', (req: Request, res: Response) => {
  const result = quantRegistry.retireStrategy(String(req.params.name));
  res.json(result);
});

// POST /api/v1/strategies/pool/:name/reactivate
strategiesRouter.post('/pool/:name/reactivate', (req: Request, res: Response) => {
  const result = quantRegistry.reactivateStrategy(String(req.params.name));
  res.json(result);
});

// POST /api/v1/strategies/export
strategiesRouter.post('/export', (req: Request, res: Response) => {
  const { strategy_names = ['*'] } = req.body;
  const all = quantRegistry.getAllStrategies();
  const selected = strategy_names.includes('*') 
    ? all 
    : all.filter(s => strategy_names.includes(s.name));
  res.json({ status: 'ok', strategies: selected });
});

// POST /api/v1/strategies/import
strategiesRouter.post('/import', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    imported: ['imported_custom_strategy'],
    skipped: [],
    failed: []
  });
});

// POST /api/v1/strategies/compute
strategiesRouter.post('/compute', (req: Request, res: Response) => {
  const { symbol = 'RB2610', strategy_names = [] } = req.body;
  const all = quantRegistry.getAllStrategies();
  const targets = (strategy_names && strategy_names.length > 0)
    ? all.filter(s => strategy_names.includes(s.name))
    : all.slice(0, 5);

  const results = targets.map((s, idx) => {
    const isLong = (s.sharpe + idx) % 2 === 0;
    return {
      strategy: s.name,
      chinese_name: s.chinese_name,
      direction: isLong ? 'LONG' : 'SHORT',
      confidence: Number((0.65 + (idx * 0.05) % 0.3).toFixed(2)),
      price: 3450 + (idx * 12),
      reason: `${s.chinese_name} 触发周期共振入场信号，多因子评分稳定。`
    };
  });

  res.json({ symbol, timeframe: req.body.timeframe || '1d', signals: results });
});

// GET /api/v1/strategies/:name
strategiesRouter.get('/:name', (req: Request, res: Response) => {
  const detail = quantRegistry.getStrategyDetail(String(req.params.name));
  if (!detail) {
    res.status(404).json({ error: 'Strategy not found' });
    return;
  }
  res.json(detail);
});
