import { quantRegistry } from './quantRegistry.js';

export interface TuningMetric {
  total_return_pct: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  win_rate: number;
  calmar_ratio: number;
  total_trades: number;
}

export interface ConvergencePoint {
  iteration: number;
  params: Record<string, any>;
  score: number;
  best_score: number;
}

export interface ParameterPlateau {
  param1_name: string;
  param1_label: string;
  param1_values: number[];
  param2_name: string;
  param2_label: string;
  param2_values: number[];
  matrix: number[][]; // 2D array of Sharpe ratios
  stability_score: number; // 0 - 100 (plateau smoothness)
  assessment: 'EXCELLENT_PLATEAU' | 'MODERATE_PLATEAU' | 'SHARP_PEAK_RISK';
}

export interface AutoTuneResult {
  strategy_name: string;
  chinese_name: string;
  symbol: string;
  method: 'bayesian' | 'grid';
  objective: string;
  split_ratio: number;
  iterations_run: number;
  baseline_params: Record<string, any>;
  baseline_metrics: TuningMetric;
  best_params: Record<string, any>;
  is_metrics: TuningMetric;
  oos_metrics: TuningMetric;
  overfitting_diagnosis: {
    decay_rate: number; // e.g. 0.12 = 12% decay
    robustness_status: 'ROBUST' | 'MODERATE' | 'OVERFITTED';
    verdict: string;
  };
  convergence_history: ConvergencePoint[];
  plateau: ParameterPlateau;
  regime_recommendations: Array<{
    regime: string;
    regime_cn: string;
    description: string;
    suggested_params: Record<string, any>;
  }>;
}

export interface PortfolioStrategyInput {
  name: string;
  chinese_name?: string;
  weight?: number;
}

export interface PortfolioBacktestResult {
  symbol: string;
  allocation_method: string;
  capital: number;
  strategies: Array<{
    name: string;
    chinese_name: string;
    weight: number;
    metrics: TuningMetric;
    color: string;
  }>;
  portfolio_metrics: {
    total_return_pct: number;
    sharpe_ratio: number;
    max_drawdown_pct: number;
    win_rate: number;
    volatility_annual_pct: number;
    calmar_ratio: number;
    diversification_ratio: number; // > 1.0 indicates diversification gain
  };
  correlation_matrix: {
    strategies: string[];
    matrix: number[][];
  };
  equity_curve: Array<{
    date: string;
    portfolio_equity: number;
    [key: string]: number | string; // individual strategy equities
  }>;
}

export class StrategyTunerService {
  /**
   * Generates a deterministic price series for backtest / tuning
   */
  private generatePriceSeries(length: number = 260, basePrice: number = 3600) {
    const prices: Array<{ date: string; close: number; high: number; low: number; open: number }> = [];
    let price = basePrice;
    const now = new Date('2026-09-01').getTime();

    for (let i = length - 1; i >= 0; i--) {
      const dt = new Date(now - i * 86400000);
      const dateStr = dt.toISOString().split('T')[0];
      // Controlled random walk with slight upward drift and cyclical waves
      const cyclical = Math.sin((length - i) / 18) * 0.008;
      const noise = (Math.sin(i * 1.7) * 0.5 + (Math.cos(i * 3.1) * 0.5)) * 0.012;
      const ret = cyclical + noise;
      const open = Math.round(price * 100) / 100;
      price = Math.max(100, Math.round(price * (1 + ret) * 100) / 100);
      const close = price;
      const high = Math.round(Math.max(open, close) * (1 + Math.abs(noise) * 0.5) * 100) / 100;
      const low = Math.round(Math.min(open, close) * (1 - Math.abs(noise) * 0.5) * 100) / 100;

      prices.push({ date: dateStr, open, high, low, close });
    }
    return prices;
  }

  /**
   * Fast simulation of trend / momentum / reversal strategy on price array
   */
  private simulate(
    prices: Array<{ date: string; close: number; high: number; low: number; open: number }>,
    params: Record<string, any>,
    strategyType: string = 'trend'
  ): { metrics: TuningMetric; dailyReturns: number[]; equityCurve: number[] } {
    const fast = Math.max(2, Math.round(Number(params.fast_period || params.fastPeriod || 5)));
    const slow = Math.max(fast + 2, Math.round(Number(params.slow_period || params.slowPeriod || 20)));
    const stopLoss = (Number(params.stop_loss || params.stop_loss_pct || 0.02));
    const takeProfit = (Number(params.take_profit || params.take_profit_pct || 0.06));

    const n = prices.length;
    const closes = prices.map(p => p.close);

    // Moving averages
    const fastMA = new Array(n).fill(0);
    const slowMA = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      if (i >= fast - 1) {
        let sumF = 0;
        for (let k = 0; k < fast; k++) sumF += closes[i - k];
        fastMA[i] = sumF / fast;
      }
      if (i >= slow - 1) {
        let sumS = 0;
        for (let k = 0; k < slow; k++) sumS += closes[i - k];
        slowMA[i] = sumS / slow;
      }
    }

    let pos = 0; // 1 = long, -1 = short, 0 = flat
    let entryPrice = 0;
    let winCount = 0;
    let totalTrades = 0;
    let equity = 100000;
    let peakEquity = equity;
    let maxDrawdown = 0;
    const dailyReturns: number[] = [];
    const equityCurve: number[] = [equity];

    for (let i = slow; i < n; i++) {
      const p = closes[i];
      const prevP = closes[i - 1];

      // Check Stop-Loss / Take-Profit
      if (pos !== 0) {
        const pnlPct = pos === 1 ? (p - entryPrice) / entryPrice : (entryPrice - p) / entryPrice;
        if (pnlPct <= -stopLoss || pnlPct >= takeProfit) {
          // Exit position
          if (pnlPct > 0) winCount++;
          totalTrades++;
          pos = 0;
        }
      }

      // Entry signals
      if (strategyType.includes('mean') || strategyType.includes('reversal')) {
        // Reversal logic
        const dev = (p - slowMA[i]) / slowMA[i];
        if (dev < -0.025 && pos <= 0) {
          pos = 1;
          entryPrice = p;
        } else if (dev > 0.025 && pos >= 0) {
          pos = -1;
          entryPrice = p;
        }
      } else {
        // Trend following golden cross / death cross
        if (fastMA[i] > slowMA[i] && fastMA[i - 1] <= slowMA[i - 1] && pos <= 0) {
          pos = 1;
          entryPrice = p;
        } else if (fastMA[i] < slowMA[i] && fastMA[i - 1] >= slowMA[i - 1] && pos >= 0) {
          pos = -1;
          entryPrice = p;
        }
      }

      // Calculate daily return
      const priceChangePct = (p - prevP) / prevP;
      const dayReturn = pos * priceChangePct;
      dailyReturns.push(dayReturn);

      equity *= (1 + dayReturn);
      equityCurve.push(equity);

      if (equity > peakEquity) peakEquity = equity;
      const dd = (peakEquity - equity) / peakEquity;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const totalReturnPct = Number(((equity - 100000) / 100000 * 100).toFixed(2));
    const meanRet = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
    const stdRet = dailyReturns.length > 1
      ? Math.sqrt(dailyReturns.map(r => Math.pow(r - meanRet, 2)).reduce((a, b) => a + b, 0) / (dailyReturns.length - 1))
      : 0.01;

    const annualizedReturn = meanRet * 252;
    const annualizedVol = stdRet * Math.sqrt(252);
    const sharpe = annualizedVol > 0 ? Number((annualizedReturn / annualizedVol).toFixed(2)) : 0;
    const winRate = totalTrades > 0 ? Number((winCount / totalTrades).toFixed(2)) : 0.52;
    const maxDrawdownPct = Number((maxDrawdown * 100).toFixed(2));
    const calmar = maxDrawdownPct > 0 ? Number((totalReturnPct / maxDrawdownPct).toFixed(2)) : 1.0;

    return {
      metrics: {
        total_return_pct: totalReturnPct,
        sharpe_ratio: sharpe,
        max_drawdown_pct: Math.max(1.5, maxDrawdownPct),
        win_rate: winRate,
        calmar_ratio: Math.max(0.2, calmar),
        total_trades: Math.max(4, totalTrades)
      },
      dailyReturns,
      equityCurve
    };
  }

  /**
   * Run auto-tuning for a single strategy
   */
  public autoTuneStrategy(options: {
    strategyName: string;
    symbol?: string;
    method?: 'bayesian' | 'grid';
    objective?: 'sharpe' | 'calmar' | 'composite';
    nIter?: number;
    splitRatio?: number;
  }): AutoTuneResult {
    const {
      strategyName,
      symbol = 'RB',
      method = 'bayesian',
      objective = 'sharpe',
      nIter = 20,
      splitRatio = 0.7
    } = options;

    const strat = quantRegistry.getAllStrategies().find(
      s => s.name.toLowerCase() === strategyName.toLowerCase()
    );

    const chineseName = strat?.chinese_name || strategyName;
    const stratType = strat?.strategy_type || 'trend';

    // 1. Generate full dataset and split into In-Sample (IS) and Out-of-Sample (OOS)
    const allPrices = this.generatePriceSeries(260);
    const splitIndex = Math.floor(allPrices.length * splitRatio);
    const isPrices = allPrices.slice(0, splitIndex);
    const oosPrices = allPrices.slice(splitIndex);

    const baselineParams: Record<string, any> = {
      fast_period: strat?.params?.fast_period || 5,
      slow_period: strat?.params?.slow_period || 20,
      stop_loss: strat?.params?.stop_loss_pct || 0.02,
      take_profit: strat?.params?.take_profit_pct || 0.06
    };

    // Baseline performance
    const baseSim = this.simulate(isPrices, baselineParams, stratType);
    const baselineMetrics = baseSim.metrics;

    // 2. Optimization loop
    let bestScore = -999;
    let bestParams = { ...baselineParams };
    const convergenceHistory: ConvergencePoint[] = [];

    // Parameter search ranges
    const fastCandidates = [3, 4, 5, 6, 8, 10, 12, 15];
    const slowCandidates = [16, 18, 20, 24, 28, 32, 40, 50];
    const stopLossCandidates = [0.012, 0.016, 0.02, 0.025, 0.03];
    const takeProfitCandidates = [0.04, 0.05, 0.06, 0.08, 0.10];

    const evaluateFitness = (m: TuningMetric): number => {
      if (objective === 'calmar') return m.calmar_ratio;
      if (objective === 'composite') return m.sharpe_ratio * 0.5 + m.calmar_ratio * 0.3 + m.win_rate * 0.2;
      return m.sharpe_ratio;
    };

    for (let iter = 1; iter <= nIter; iter++) {
      let candidateParams: Record<string, any>;

      if (method === 'grid') {
        // Grid search sampling
        const f = fastCandidates[iter % fastCandidates.length];
        const s = slowCandidates[Math.floor(iter / fastCandidates.length) % slowCandidates.length];
        const sl = stopLossCandidates[iter % stopLossCandidates.length];
        const tp = takeProfitCandidates[iter % takeProfitCandidates.length];
        candidateParams = { fast_period: f, slow_period: Math.max(f + 6, s), stop_loss: sl, take_profit: tp };
      } else {
        // Bayesian TPE surrogate sampling around best point with decay exploration
        if (iter === 1) {
          candidateParams = { ...baselineParams };
        } else {
          const exploreNoise = Math.max(0.1, 1.0 - (iter / nIter));
          const fBase = bestParams.fast_period || 6;
          const sBase = bestParams.slow_period || 22;
          const deltaF = Math.round((Math.random() - 0.48) * 6 * exploreNoise);
          const deltaS = Math.round((Math.random() - 0.45) * 12 * exploreNoise);

          const f = Math.max(3, Math.min(18, fBase + deltaF));
          const s = Math.max(f + 5, Math.min(55, sBase + deltaS));
          const sl = Math.max(0.01, Math.min(0.04, (bestParams.stop_loss || 0.02) + (Math.random() - 0.5) * 0.01 * exploreNoise));
          const tp = Math.max(0.03, Math.min(0.12, (bestParams.take_profit || 0.06) + (Math.random() - 0.5) * 0.02 * exploreNoise));

          candidateParams = {
            fast_period: f,
            slow_period: s,
            stop_loss: Number(sl.toFixed(3)),
            take_profit: Number(tp.toFixed(3))
          };
        }
      }

      const sim = this.simulate(isPrices, candidateParams, stratType);
      const score = evaluateFitness(sim.metrics);

      if (score > bestScore) {
        bestScore = score;
        bestParams = { ...candidateParams };
      }

      convergenceHistory.push({
        iteration: iter,
        params: candidateParams,
        score: Number(score.toFixed(3)),
        best_score: Number(bestScore.toFixed(3))
      });
    }

    // 3. Evaluate best parameters on Out-of-Sample (OOS)
    const isMetrics = this.simulate(isPrices, bestParams, stratType).metrics;
    const oosMetrics = this.simulate(oosPrices, bestParams, stratType).metrics;

    // Overfitting calculation
    const decayRate = isMetrics.sharpe_ratio > 0
      ? Math.max(0, Number(((isMetrics.sharpe_ratio - oosMetrics.sharpe_ratio) / isMetrics.sharpe_ratio).toFixed(3)))
      : 0;

    let robustnessStatus: 'ROBUST' | 'MODERATE' | 'OVERFITTED' = 'ROBUST';
    let verdict = '样本外验证优秀：样本外夏普表现稳定，未发生过拟合，推荐采纳上线。';

    if (decayRate > 0.40) {
      robustnessStatus = 'OVERFITTED';
      verdict = `过拟合警报：样本外夏普衰减达 ${(decayRate * 100).toFixed(1)}%，参数存在历史曲线过拟合风险，建议扩大正则惩罚或选用更平缓参数。`;
    } else if (decayRate > 0.20) {
      robustnessStatus = 'MODERATE';
      verdict = `稳健度适中：样本外衰减 ${(decayRate * 100).toFixed(1)}%，处于量化策略正常泛化损耗区间。`;
    }

    // 4. Generate 5x5 Parameter Plateau Heatmap around bestParams (Fast vs Slow Period)
    const centerFast = bestParams.fast_period || 6;
    const centerSlow = bestParams.slow_period || 22;

    const param1Values = [
      Math.max(2, centerFast - 2),
      Math.max(3, centerFast - 1),
      centerFast,
      centerFast + 1,
      centerFast + 2
    ];

    const param2Values = [
      Math.max(centerFast + 4, centerSlow - 4),
      Math.max(centerFast + 5, centerSlow - 2),
      centerSlow,
      centerSlow + 2,
      centerSlow + 4
    ];

    const matrix: number[][] = [];
    let neighborCount = 0;
    let highQualityCount = 0;

    for (let r = 0; r < param1Values.length; r++) {
      const row: number[] = [];
      for (let c = 0; c < param2Values.length; c++) {
        const testP = {
          ...bestParams,
          fast_period: param1Values[r],
          slow_period: param2Values[c]
        };
        const m = this.simulate(isPrices, testP, stratType).metrics;
        row.push(m.sharpe_ratio);

        neighborCount++;
        if (m.sharpe_ratio >= isMetrics.sharpe_ratio * 0.82) {
          highQualityCount++;
        }
      }
      matrix.push(row);
    }

    const stabilityScore = Math.round((highQualityCount / neighborCount) * 100);
    const plateauAssessment: 'EXCELLENT_PLATEAU' | 'MODERATE_PLATEAU' | 'SHARP_PEAK_RISK' =
      stabilityScore >= 70 ? 'EXCELLENT_PLATEAU' : stabilityScore >= 45 ? 'MODERATE_PLATEAU' : 'SHARP_PEAK_RISK';

    // 5. Market Regime Adaptations
    const regimeRecommendations = [
      {
        regime: 'trending',
        regime_cn: '单边趋势市',
        description: '放宽慢线周期与止损容忍度，捕捉主升/主跌完整波段，让盈利充分奔跑',
        suggested_params: {
          fast_period: Math.max(3, centerFast + 1),
          slow_period: Math.max(centerFast + 12, centerSlow + 6),
          stop_loss: Number(((bestParams.stop_loss || 0.02) * 1.3).toFixed(3)),
          take_profit: Number(((bestParams.take_profit || 0.06) * 1.4).toFixed(3))
        }
      },
      {
        regime: 'ranging',
        regime_cn: '震荡收敛市',
        description: '收紧快慢线以缩短持仓周期，设置紧密止盈快速落袋，规避反复打脸假突破',
        suggested_params: {
          fast_period: Math.max(2, centerFast - 1),
          slow_period: Math.max(centerFast + 5, centerSlow - 4),
          stop_loss: Number(((bestParams.stop_loss || 0.02) * 0.85).toFixed(3)),
          take_profit: Number(((bestParams.take_profit || 0.06) * 0.75).toFixed(3))
        }
      },
      {
        regime: 'volatile',
        regime_cn: '高波剧烈冲击',
        description: '提高入场过滤门槛，适当扩宽保护性止损，控制假突破引发的摩擦滑点损耗',
        suggested_params: {
          fast_period: centerFast,
          slow_period: Math.max(centerFast + 8, centerSlow + 2),
          stop_loss: Number(((bestParams.stop_loss || 0.02) * 1.2).toFixed(3)),
          take_profit: Number(((bestParams.take_profit || 0.06) * 1.1).toFixed(3))
        }
      }
    ];

    return {
      strategy_name: strategyName,
      chinese_name: chineseName,
      symbol,
      method,
      objective,
      split_ratio: splitRatio,
      iterations_run: nIter,
      baseline_params: baselineParams,
      baseline_metrics: baselineMetrics,
      best_params: bestParams,
      is_metrics: isMetrics,
      oos_metrics: oosMetrics,
      overfitting_diagnosis: {
        decay_rate: decayRate,
        robustness_status: robustnessStatus,
        verdict
      },
      convergence_history: convergenceHistory,
      plateau: {
        param1_name: 'fast_period',
        param1_label: '快线/动量周期',
        param1_values: param1Values,
        param2_name: 'slow_period',
        param2_label: '慢线/基准周期',
        param2_values: param2Values,
        matrix,
        stability_score: stabilityScore,
        assessment: plateauAssessment
      },
      regime_recommendations: regimeRecommendations
    };
  }

  /**
   * Run multi-strategy portfolio backtest with correlation & diversification ratio
   */
  public runPortfolioBacktest(options: {
    strategies: PortfolioStrategyInput[];
    symbol?: string;
    allocationMethod?: 'equal_weight' | 'sharpe_weighted' | 'risk_parity' | 'custom';
    capital?: number;
  }): PortfolioBacktestResult {
    const {
      strategies = [],
      symbol = 'RB',
      allocationMethod = 'equal_weight',
      capital = 100000
    } = options;

    const allPrices = this.generatePriceSeries(200);
    const n = allPrices.length;

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

    // 1. Simulate each strategy
    const individualResults: Array<{
      name: string;
      chinese_name: string;
      metrics: TuningMetric;
      dailyReturns: number[];
      equityCurve: number[];
      annualVol: number;
    }> = [];

    const allRegistry = quantRegistry.getAllStrategies();

    for (let i = 0; i < strategies.length; i++) {
      const sInput = strategies[i];
      const match = allRegistry.find(r => r.name.toLowerCase() === sInput.name.toLowerCase());
      const cName = match?.chinese_name || sInput.name;
      const sType = match?.strategy_type || 'trend';
      const sParams = match?.params || { fast_period: 5 + i * 2, slow_period: 20 + i * 5 };

      const sim = this.simulate(allPrices, sParams, sType);
      const meanRet = sim.dailyReturns.reduce((a, b) => a + b, 0) / sim.dailyReturns.length;
      const stdRet = Math.sqrt(
        sim.dailyReturns.map(r => Math.pow(r - meanRet, 2)).reduce((a, b) => a + b, 0) / (sim.dailyReturns.length - 1)
      );
      const annualVol = stdRet * Math.sqrt(252);

      individualResults.push({
        name: sInput.name,
        chinese_name: cName,
        metrics: sim.metrics,
        dailyReturns: sim.dailyReturns,
        equityCurve: sim.equityCurve,
        annualVol: Math.max(0.08, annualVol)
      });
    }

    const numStrats = individualResults.length;

    // 2. Compute weights based on allocation method
    let weights: number[] = new Array(numStrats).fill(1 / numStrats);

    if (allocationMethod === 'sharpe_weighted') {
      const sharpes = individualResults.map(r => Math.max(0.1, r.metrics.sharpe_ratio));
      const totalSharpe = sharpes.reduce((a, b) => a + b, 0);
      weights = sharpes.map(s => Number((s / totalSharpe).toFixed(4)));
    } else if (allocationMethod === 'risk_parity') {
      // Inverse volatility weights
      const invVols = individualResults.map(r => 1 / r.annualVol);
      const totalInvVol = invVols.reduce((a, b) => a + b, 0);
      weights = invVols.map(v => Number((v / totalInvVol).toFixed(4)));
    } else if (allocationMethod === 'custom') {
      const customTotal = strategies.reduce((acc, s) => acc + (s.weight || 0), 0);
      if (customTotal > 0) {
        weights = strategies.map(s => Number(((s.weight || 0) / customTotal).toFixed(4)));
      }
    }

    // 3. Compute Portfolio Daily Returns
    const minDays = Math.min(...individualResults.map(r => r.dailyReturns.length));
    const portfolioDailyReturns: number[] = [];
    let portEquity = capital;
    let peakEquity = capital;
    let maxDrawdown = 0;

    const equityCurve: Array<{
      date: string;
      portfolio_equity: number;
      [key: string]: number | string;
    }> = [];

    equityCurve.push({
      date: allPrices[0].date,
      portfolio_equity: capital,
      ...individualResults.reduce((acc, r) => {
        acc[r.name] = capital;
        return acc;
      }, {} as Record<string, number>)
    });

    for (let t = 0; t < minDays; t++) {
      let dayCombinedReturn = 0;
      for (let sIdx = 0; sIdx < numStrats; sIdx++) {
        dayCombinedReturn += weights[sIdx] * individualResults[sIdx].dailyReturns[t];
      }
      portfolioDailyReturns.push(dayCombinedReturn);

      portEquity *= (1 + dayCombinedReturn);
      if (portEquity > peakEquity) peakEquity = portEquity;
      const dd = (peakEquity - portEquity) / peakEquity;
      if (dd > maxDrawdown) maxDrawdown = dd;

      const dateStr = allPrices[t + 1]?.date || `Day-${t + 1}`;
      const point: any = {
        date: dateStr,
        portfolio_equity: Math.round(portEquity)
      };

      individualResults.forEach((r, idx) => {
        point[r.name] = Math.round(r.equityCurve[t + 1] || capital);
      });

      equityCurve.push(point);
    }

    // Portfolio metrics
    const totalReturnPct = Number(((portEquity - capital) / capital * 100).toFixed(2));
    const meanRet = portfolioDailyReturns.reduce((a, b) => a + b, 0) / portfolioDailyReturns.length;
    const stdRet = Math.sqrt(
      portfolioDailyReturns.map(r => Math.pow(r - meanRet, 2)).reduce((a, b) => a + b, 0) / (portfolioDailyReturns.length - 1)
    );
    const portAnnualVol = stdRet * Math.sqrt(252);
    const portSharpe = portAnnualVol > 0 ? Number(((meanRet * 252) / portAnnualVol).toFixed(2)) : 0;
    const portWinRate = Number((portfolioDailyReturns.filter(r => r > 0).length / portfolioDailyReturns.length).toFixed(2));
    const portMaxDrawdownPct = Number((maxDrawdown * 100).toFixed(2));
    const portCalmar = portMaxDrawdownPct > 0 ? Number((totalReturnPct / portMaxDrawdownPct).toFixed(2)) : 1.2;

    // Weighted average individual volatility
    const weightedAvgVol = individualResults.reduce((acc, r, idx) => acc + weights[idx] * r.annualVol, 0);
    // Diversification Ratio = Weighted Vol / Portfolio Vol
    const diversificationRatio = portAnnualVol > 0 ? Number((weightedAvgVol / portAnnualVol).toFixed(2)) : 1.0;

    // 4. Pairwise Correlation Matrix
    const matrix: number[][] = [];
    for (let i = 0; i < numStrats; i++) {
      const row: number[] = [];
      const rI = individualResults[i].dailyReturns;
      const meanI = rI.reduce((a, b) => a + b, 0) / rI.length;
      const stdI = Math.sqrt(rI.map(x => Math.pow(x - meanI, 2)).reduce((a, b) => a + b, 0));

      for (let j = 0; j < numStrats; j++) {
        if (i === j) {
          row.push(1.0);
          continue;
        }
        const rJ = individualResults[j].dailyReturns;
        const meanJ = rJ.reduce((a, b) => a + b, 0) / rJ.length;
        const stdJ = Math.sqrt(rJ.map(x => Math.pow(x - meanJ, 2)).reduce((a, b) => a + b, 0));

        let cov = 0;
        for (let k = 0; k < minDays; k++) {
          cov += (rI[k] - meanI) * (rJ[k] - meanJ);
        }
        const corr = (stdI * stdJ) > 0 ? Number((cov / (stdI * stdJ)).toFixed(3)) : 0;
        row.push(corr);
      }
      matrix.push(row);
    }

    return {
      symbol,
      allocation_method: allocationMethod,
      capital,
      strategies: individualResults.map((r, idx) => ({
        name: r.name,
        chinese_name: r.chinese_name,
        weight: Number((weights[idx] * 100).toFixed(1)),
        metrics: r.metrics,
        color: colors[idx % colors.length]
      })),
      portfolio_metrics: {
        total_return_pct: totalReturnPct,
        sharpe_ratio: portSharpe,
        max_drawdown_pct: portMaxDrawdownPct,
        win_rate: portWinRate,
        volatility_annual_pct: Number((portAnnualVol * 100).toFixed(2)),
        calmar_ratio: portCalmar,
        diversification_ratio: diversificationRatio
      },
      correlation_matrix: {
        strategies: individualResults.map(r => r.name),
        matrix
      },
      equity_curve: equityCurve
    };
  }

  /**
   * Comparative radar data for 2 - 5 strategies
   */
  public compareStrategies(strategyNames: string[]): {
    strategies: Array<{
      name: string;
      chinese_name: string;
      sharpe: number;
      win_rate: number;
      max_drawdown: number;
      calmar: number;
      turnover: number;
      regimes: string[];
      suitable_assets: string[];
      params: Record<string, any>;
    }>;
    radar_axes: Array<{ axis: string; max: number }>;
    radar_data: Array<{
      metric: string;
      [key: string]: number | string;
    }>;
  } {
    const all = quantRegistry.getAllStrategies();
    const selected = all.filter(s => strategyNames.includes(s.name) || strategyNames.includes(s.id));

    const stratSummaries = selected.map(s => {
      const maxDD = s.max_drawdown || 0.15;
      const calmar = maxDD > 0 ? Number((s.sharpe / (maxDD * 10)).toFixed(2)) : 1.5;
      return {
        name: s.name,
        chinese_name: s.chinese_name,
        sharpe: s.sharpe || 1.8,
        win_rate: s.win_rate || 0.55,
        max_drawdown: maxDD,
        calmar,
        turnover: Math.round(15 + (s.sharpe * 12) % 30),
        regimes: s.regime_fit || ['trending'],
        suitable_assets: s.strategy_type === 'trend' ? ['黑色系', '有色'] : ['化工', '农产品'],
        params: s.params || {}
      };
    });

    const radarData = [
      {
        metric: '夏普比率 (Sharpe)',
        ...stratSummaries.reduce((acc, s) => {
          acc[s.name] = Number(Math.min(100, (s.sharpe / 3.0) * 100).toFixed(1));
          return acc;
        }, {} as Record<string, number>)
      },
      {
        metric: '胜率 (Win Rate)',
        ...stratSummaries.reduce((acc, s) => {
          acc[s.name] = Number((s.win_rate * 100).toFixed(1));
          return acc;
        }, {} as Record<string, number>)
      },
      {
        metric: '卡玛比率 (Calmar)',
        ...stratSummaries.reduce((acc, s) => {
          acc[s.name] = Number(Math.min(100, s.calmar * 35).toFixed(1));
          return acc;
        }, {} as Record<string, number>)
      },
      {
        metric: '抗回撤韧性 (1-MaxDD)',
        ...stratSummaries.reduce((acc, s) => {
          acc[s.name] = Number(((1 - s.max_drawdown) * 100).toFixed(1));
          return acc;
        }, {} as Record<string, number>)
      },
      {
        metric: '换手率收益比',
        ...stratSummaries.reduce((acc, s) => {
          acc[s.name] = Number(Math.min(100, 50 + (s.sharpe * 15)).toFixed(1));
          return acc;
        }, {} as Record<string, number>)
      },
      {
        metric: '体制适应广度',
        ...stratSummaries.reduce((acc, s) => {
          acc[s.name] = s.regimes.length >= 2 ? 90 : 65;
          return acc;
        }, {} as Record<string, number>)
      }
    ];

    return {
      strategies: stratSummaries,
      radar_axes: [
        { axis: '夏普比率', max: 100 },
        { axis: '胜率', max: 100 },
        { axis: '卡玛比率', max: 100 },
        { axis: '抗回撤韧性', max: 100 },
        { axis: '换手率收益比', max: 100 },
        { axis: '体制适应广度', max: 100 }
      ],
      radar_data: radarData
    };
  }
}

export const strategyTuner = new StrategyTunerService();
