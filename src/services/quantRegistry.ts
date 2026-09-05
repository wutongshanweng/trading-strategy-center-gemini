import registryData from './quantRegistryData.json';

export interface StrategyCatalogItem {
  id: string;
  name: string;
  chinese_name: string;
  strategy_type: string;
  type: string;
  description: string;
  regime_fit: string[];
  timeframes: string[];
  sharpe: number;
  win_rate: number;
  max_drawdown: number;
  total_trades: number;
  is_active: boolean;
  status: 'active' | 'paused' | 'retired' | 'champion' | 'challenger';
  params: Record<string, any>;
}

export interface FactorCatalogItem {
  name: string;
  category: string;
  category_cn: string;
  description: string;
  formula: string;
  ic: number;
  ir: number;
  turnover: number;
  health: 'HEALTHY' | 'WARNING' | 'DECAYED';
  risk_adj_return: number;
  monotonicity: string;
}

export class QuantRegistry {
  private strategies: StrategyCatalogItem[] = (registryData.strategies as StrategyCatalogItem[]) || [];
  private factors: FactorCatalogItem[] = (registryData.factors as FactorCatalogItem[]) || [];
  private whitelist: Set<string> = new Set(['trend_ma_cross', 'reversal_rsi', 'breakout_donchian', 'chan_bsp', 'rsrs_timing']);
  private retired: Set<string> = new Set(['meanrev_overnight', 'momentum_acceleration']);

  public getStrategiesCount(): number {
    return this.strategies.length;
  }

  public getFactorsCount(): number {
    return this.factors.length;
  }

  public getAllStrategies(): StrategyCatalogItem[] {
    return this.strategies;
  }

  public getAllFactors(): FactorCatalogItem[] {
    return this.factors;
  }

  public getGroupedStrategies() {
    const types: Record<string, { count: number; active: number; inactive: number; strategies: StrategyCatalogItem[] }> = {};
    for (const s of this.strategies) {
      const t = s.strategy_type || 'other';
      if (!types[t]) {
        types[t] = { count: 0, active: 0, inactive: 0, strategies: [] };
      }
      types[t].count++;
      if (s.is_active) {
        types[t].active++;
      } else {
        types[t].inactive++;
      }
      types[t].strategies.push(s);
    }
    return {
      total: this.strategies.length,
      types
    };
  }

  public getStrategyCatalog(params?: { type?: string; regime?: string; active_only?: boolean }) {
    let result = [...this.strategies];
    if (params?.type) {
      result = result.filter(s => s.strategy_type === params.type);
    }
    if (params?.regime) {
      result = result.filter(s => s.regime_fit.includes(params.regime!) || s.regime_fit.includes('all'));
    }
    if (params?.active_only) {
      result = result.filter(s => s.is_active);
    }
    return {
      total: result.length,
      strategies: result
    };
  }

  public getStrategyDetail(name: string) {
    const s = this.strategies.find(x => x.name.toLowerCase() === name.toLowerCase() || x.id.toLowerCase() === name.toLowerCase());
    if (!s) return null;
    return {
      name: s.name,
      chinese_name: s.chinese_name,
      description: s.description,
      timeframes: s.timeframes,
      strategy_type: s.strategy_type,
      params: s.params,
      sharpe: s.sharpe,
      win_rate: s.win_rate,
      max_drawdown: s.max_drawdown,
      total_trades: s.total_trades,
      is_active: s.is_active
    };
  }

  public getStrategyPool() {
    const champions = this.strategies.filter(s => s.sharpe >= 2.0 && !this.retired.has(s.name)).map(s => ({
      name: s.name,
      chinese_name: s.chinese_name,
      sharpe: s.sharpe,
      status: 'champion',
      regime: s.regime_fit[0] || 'trending',
      n_evals: 120,
      pass_rate: 0.85,
      avg_oos_sharpe: Number((s.sharpe * 0.92).toFixed(2)),
      allocation: 0.25,
      eligible: true
    }));

    const challengers = this.strategies.filter(s => s.sharpe < 2.0 && s.sharpe >= 1.4 && !this.retired.has(s.name)).map(s => ({
      name: s.name,
      chinese_name: s.chinese_name,
      sharpe: s.sharpe,
      status: 'challenger',
      regime: s.regime_fit[0] || 'trending',
      n_evals: 60,
      pass_rate: 0.72,
      avg_oos_sharpe: Number((s.sharpe * 0.88).toFixed(2)),
      allocation: 0.10,
      eligible: true
    }));

    const retired = this.strategies.filter(s => s.sharpe < 1.4 || this.retired.has(s.name)).map(s => ({
      name: s.name,
      chinese_name: s.chinese_name,
      sharpe: s.sharpe,
      status: 'retired',
      regime: s.regime_fit[0] || 'ranging',
      n_evals: 30,
      pass_rate: 0.45,
      avg_oos_sharpe: Number((s.sharpe * 0.70).toFixed(2)),
      allocation: 0,
      eligible: false
    }));

    return { champions, challengers, retired };
  }

  public getStrategyDegradation() {
    return {
      total_tracked: this.strategies.length,
      at_risk: [
        { name: 'meanrev_overnight', zero_days: 12 },
        { name: 'momentum_acceleration', zero_days: 9 },
        { name: 'trend_multi_timeframe', zero_days: 5 }
      ],
      threshold_days: 7
    };
  }

  public getWhitelist(): string[] {
    return Array.from(this.whitelist);
  }

  public addToWhitelist(names: string[]) {
    names.forEach(n => this.whitelist.add(n));
    return Array.from(this.whitelist);
  }

  public removeFromWhitelist(name: string) {
    this.whitelist.delete(name);
    return Array.from(this.whitelist);
  }

  public retireStrategy(name: string) {
    this.retired.add(name);
    const s = this.strategies.find(x => x.name === name);
    if (s) {
      s.status = 'retired';
      s.is_active = false;
    }
    return { status: 'ok', name };
  }

  public reactivateStrategy(name: string) {
    this.retired.delete(name);
    const s = this.strategies.find(x => x.name === name);
    if (s) {
      s.status = 'active';
      s.is_active = true;
    }
    return { status: 'ok', name };
  }

  public updateStrategyParams(name: string, params: Record<string, any>) {
    const s = this.strategies.find(x => x.name === name || x.name.toLowerCase() === name.toLowerCase());
    if (!s) return null;
    s.params = { ...s.params, ...params };
    return s;
  }

  public getFactorDescriptions() {
    const map: Record<string, any> = {};
    for (const f of this.factors) {
      map[f.name] = {
        name: f.name,
        category: f.category,
        category_cn: f.category_cn,
        description: f.description,
        formula: f.formula,
        ic: f.ic,
        ir: f.ir,
        turnover: f.turnover,
        health: f.health,
        risk_adj_return: f.risk_adj_return,
        monotonicity: f.monotonicity
      };
    }
    return map;
  }

  public getFactorsList(category?: string) {
    let list = this.factors;
    if (category) {
      list = list.filter(f => f.category === category || f.category_cn === category);
    }
    return {
      total: list.length,
      factors: list
    };
  }
}

export const quantRegistry = new QuantRegistry();
