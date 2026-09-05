/**
 * Multi-Period K-Line Resampler & Aggregation Engine
 * 多周期 K 线重采样与动态聚合引擎 (M1/D1 -> M5/M15/M30/H1/H4/W1/MO1)
 */

export interface KlineBar {
  id?: number;
  symbol: string;
  period: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  open_interest?: number | null;
  created_at: Date | string;
}

export type SupportedPeriod = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '4d' | '1w' | '1mo';

export const PERIOD_LABELS: Record<SupportedPeriod, string> = {
  '1m': '1分钟 (M1)',
  '5m': '5分钟 (M5)',
  '15m': '15分钟 (M15)',
  '30m': '30分钟 (M30)',
  '1h': '1小时 (H1)',
  '4h': '4小时 (H4)',
  '1d': '日线 (D1)',
  '4d': '4日线 (D4)',
  '1w': '周线 (W1)',
  '1mo': '月线 (MO1)'
};

/**
 * Resample an array of base K-lines (typically 1m or 1d) into target period
 */
export function resampleKlines(baseBars: KlineBar[], targetPeriod: SupportedPeriod): KlineBar[] {
  if (!baseBars || baseBars.length === 0) return [];

  // Sort ascending by time
  const sorted = [...baseBars].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // If requested period matches base bar period exactly, return sorted
  if (sorted[0].period === targetPeriod) {
    return sorted;
  }

  const symbol = sorted[0].symbol;

  // Determine bucket size in milliseconds
  let bucketMs = 60 * 1000;
  if (targetPeriod === '5m') bucketMs = 5 * 60 * 1000;
  else if (targetPeriod === '15m') bucketMs = 15 * 60 * 1000;
  else if (targetPeriod === '30m') bucketMs = 30 * 60 * 1000;
  else if (targetPeriod === '1h') bucketMs = 60 * 60 * 1000;
  else if (targetPeriod === '4h') bucketMs = 4 * 60 * 60 * 1000;
  else if (targetPeriod === '1d') bucketMs = 24 * 60 * 60 * 1000;
  else if (targetPeriod === '4d') bucketMs = 4 * 24 * 60 * 60 * 1000;
  else if (targetPeriod === '1w') bucketMs = 7 * 24 * 60 * 60 * 1000;
  else if (targetPeriod === '1mo') bucketMs = 30 * 24 * 60 * 60 * 1000;

  // Group by bucket timestamp
  const buckets = new Map<number, KlineBar[]>();

  for (const bar of sorted) {
    const timeMs = new Date(bar.created_at).getTime();
    const bucketKey = Math.floor(timeMs / bucketMs) * bucketMs;
    
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }
    buckets.get(bucketKey)!.push(bar);
  }

  const aggregatedBars: KlineBar[] = [];

  for (const [bucketTime, bars] of buckets.entries()) {
    if (bars.length === 0) continue;

    const open = bars[0].open;
    const close = bars[bars.length - 1].close;
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;
    let openInterest = bars[bars.length - 1].open_interest ?? null;

    for (const b of bars) {
      if (b.high > high) high = b.high;
      if (b.low < low) low = b.low;
      volume += b.volume;
    }

    aggregatedBars.push({
      symbol,
      period: targetPeriod,
      open,
      high: high === -Infinity ? open : high,
      low: low === Infinity ? open : low,
      close,
      volume: Math.round(volume),
      open_interest: openInterest,
      created_at: new Date(bucketTime)
    });
  }

  return aggregatedBars;
}
