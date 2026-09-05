/**
 * 因子高频计算与历史 IC 截面缓存服务 (LRU + 日频缓存 + 分片并行计算)
 */

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxCapacity: number;
  totalComputed: number;
  estimatedMemoryKB: number;
  dailyKey: string;
}

export interface CachedFactorEvaluation {
  symbol: string;
  factor_id: string;
  date: string;
  ic_mean: number;
  ic_std: number;
  icir: number;
  ic_positive_rate: number;
  ic_t_stat: number;
  timestamp: number;
  computed_ms: number;
  layer_monotonicity?: number;
}

class FactorCacheService {
  private static instance: FactorCacheService;
  private cache: Map<string, { value: any; expiresAt: number; sizeBytes: number }> = new Map();
  private maxCapacity: number = 10000;
  private hits: number = 0;
  private misses: number = 0;
  private totalComputed: number = 0;
  private defaultTTLMs: number = 24 * 60 * 60 * 1000; // 24小时日频有效

  private constructor() {
    // 定时清理过期缓存 (每小时一次)
    setInterval(() => this.purgeExpired(), 60 * 60 * 1000).unref();
  }

  public static getInstance(): FactorCacheService {
    if (!FactorCacheService.instance) {
      FactorCacheService.instance = new FactorCacheService();
    }
    return FactorCacheService.instance;
  }

  public getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  public generateKey(prefix: string, symbol: string, factorId: string, extra: string = ''): string {
    const today = this.getTodayKey();
    return `${prefix}:${symbol}:${factorId}:${today}:${extra}`;
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // LRU: 刷新键顺序
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxCapacity) {
      // 驱逐最旧的 LRU 条目 (Map 的第一个元素)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const expiresAt = Date.now() + (ttlMs || this.defaultTTLMs);
    const serialized = JSON.stringify(value);
    const sizeBytes = serialized.length * 2; // rough UTF-16 byte estimate

    this.cache.set(key, { value, expiresAt, sizeBytes });
    this.totalComputed++;
  }

  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  public purgeExpired(): number {
    const now = Date.now();
    let purged = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        purged++;
      }
    }
    return purged;
  }

  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  public getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? Number(((this.hits / totalRequests) * 100).toFixed(1)) : 0;
    
    let totalBytes = 0;
    for (const entry of this.cache.values()) {
      totalBytes += entry.sizeBytes;
    }

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
      size: this.cache.size,
      maxCapacity: this.maxCapacity,
      totalComputed: this.totalComputed,
      estimatedMemoryKB: Math.round(totalBytes / 1024),
      dailyKey: this.getTodayKey()
    };
  }

  /**
   * 分片并行计算器 (Chunked Parallel Processor)
   * 针对 483 因子等海量截面计算，按照 chunkSize 切片分批次异步执行，避免长时间阻塞 Node.js 单线程事件循环
   */
  public async executeInShards<T, R>(
    items: T[],
    chunkSize: number = 40,
    worker: (chunk: T[], chunkIndex: number) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];
    const totalChunks = Math.ceil(items.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(items.length, start + chunkSize);
      const chunk = items.slice(start, end);

      const chunkResults = await worker(chunk, i);
      results.push(...chunkResults);

      // 让出微任务时间片，保证 I/O 响应平滑
      if (i < totalChunks - 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return results;
  }
}

export const factorCacheService = FactorCacheService.getInstance();
