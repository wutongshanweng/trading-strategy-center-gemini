import fs from 'fs';
import path from 'path';
import { db, pool } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { market_bars, klines } from '../db/schema.js';

export interface SnapshotBar {
  symbol: string;
  contract: string;
  frequency: string;
  date: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest: number;
  settlement?: number;
}

const SNAPSHOT_DIR = path.resolve(process.cwd(), 'data', 'snapshots');
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, 'market_bars_catalog.json');

/**
 * 核心数据容灾快照服务 (DataSnapshotService)
 * 作用：
 * 1. 每次网络抓取或计算生成的有效 K 线，均自动双写沉淀到本地快照文件中，杜绝任何外部数据库重启或清空导致的数据丢失
 * 2. 系统重启、数据库自愈、或从 Neon 故障降级时，自动从快照无感恢复所有历史 K 线到数据库
 * 3. 支持用户一键手动备份与恢复历史数据
 */
export class DataSnapshotService {
  private static instance: DataSnapshotService;
  private writeTimer: NodeJS.Timeout | null = null;
  private pendingBars: Map<string, SnapshotBar> = new Map();

  private constructor() {
    if (!fs.existsSync(SNAPSHOT_DIR)) {
      try {
        fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
      } catch {}
    }
  }

  public static getInstance(): DataSnapshotService {
    if (!DataSnapshotService.instance) {
      DataSnapshotService.instance = new DataSnapshotService();
    }
    return DataSnapshotService.instance;
  }

  /**
   * 记录 K 线入快照池（防抖异步持久化到本地文件）
   */
  public recordBars(contract: string, frequency: string, bars: any[]): void {
    const cleanSym = contract.trim().toUpperCase();
    const freq = frequency.toUpperCase();

    for (const b of bars) {
      const date = b.date || b.trading_date || (b.timestamp ? String(b.timestamp).split('T')[0] : '');
      const timestamp = b.timestamp || b.bar_start || b.created_at || `${date}T15:00:00.000Z`;
      const key = `${cleanSym}_${freq}_${date}_${timestamp}`;

      this.pendingBars.set(key, {
        symbol: cleanSym,
        contract: cleanSym,
        frequency: freq,
        date: String(date),
        timestamp: String(timestamp),
        open: Number(b.open) || 0,
        high: Number(b.high) || 0,
        low: Number(b.low) || 0,
        close: Number(b.close) || 0,
        volume: Number(b.volume) || 0,
        openInterest: Number(b.openInterest || b.open_interest) || 0,
        settlement: Number(b.settlement || b.close) || 0
      });
    }

    // 防抖 1.5 秒写入磁盘
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => {
      this.flushToDisk();
    }, 1500);
  }

  /**
   * 刷新刷盘写入 JSON 快照文件
   */
  public flushToDisk(): void {
    try {
      if (!fs.existsSync(SNAPSHOT_DIR)) {
        fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
      }

      let existingMap: Record<string, SnapshotBar> = {};
      if (fs.existsSync(SNAPSHOT_FILE)) {
        try {
          const content = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
          existingMap = JSON.parse(content);
        } catch {}
      }

      for (const [key, val] of this.pendingBars.entries()) {
        existingMap[key] = val;
      }

      fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(existingMap, null, 2), 'utf-8');
      this.pendingBars.clear();
      console.log(`[DataSnapshotService] Persisted ${Object.keys(existingMap).length} total snapshot bars to disk.`);
    } catch (e: any) {
      console.warn('[DataSnapshotService] Failed to flush snapshot to disk:', e.message);
    }
  }

  /**
   * 获取快照统计
   */
  public getStats(): { totalBars: number; fileExists: boolean; filePath: string } {
    if (!fs.existsSync(SNAPSHOT_FILE)) {
      return { totalBars: 0, fileExists: false, filePath: SNAPSHOT_FILE };
    }
    try {
      const content = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
      const data = JSON.parse(content);
      return { totalBars: Object.keys(data).length, fileExists: true, filePath: SNAPSHOT_FILE };
    } catch {
      return { totalBars: 0, fileExists: false, filePath: SNAPSHOT_FILE };
    }
  }

  /**
   * 自动自愈恢复：当数据库内 K 线为空或少于快照时，自动将快照回填到数据库
   */
  public async autoRecoverIfNeeded(): Promise<{ recoveredCount: number }> {
    if (!fs.existsSync(SNAPSHOT_FILE)) {
      return { recoveredCount: 0 };
    }

    try {
      const content = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
      const data: Record<string, SnapshotBar> = JSON.parse(content);
      const allBars = Object.values(data);
      if (allBars.length === 0) return { recoveredCount: 0 };

      // 检查当前 DB 中条数
      const mbRes = await pool.query('SELECT count(*)::int as count FROM market_bars');
      const currentCount = mbRes.rows[0]?.count || 0;

      if (currentCount < allBars.length) {
        console.log(`[DataSnapshotService] Current DB has ${currentCount} bars, snapshot has ${allBars.length}. Restoring...`);
        let inserted = 0;

        const batchSize = 100;
        for (let i = 0; i < allBars.length; i += batchSize) {
          const batch = allBars.slice(i, i + batchSize);
          const valuesToInsert = batch.map(b => {
            const product = b.contract.replace(/\d+$/, '');
            const exchange = b.contract.startsWith('RB') ? 'SHFE' : (b.contract.startsWith('M') ? 'DCE' : 'CZCE');
            return {
              exchange,
              product,
              contract: b.contract,
              symbol: b.contract,
              frequency: b.frequency,
              trading_date: b.date,
              bar_start: new Date(b.timestamp),
              bar_end: new Date(b.timestamp),
              bar_time: new Date(b.timestamp),
              session: b.frequency === 'D1' ? 'DAY' : 'NORMAL',
              open: b.open,
              high: b.high,
              low: b.low,
              close: b.close,
              volume: b.volume,
              turnover: b.volume * b.close * 10,
              open_interest: b.openInterest,
              settlement: b.settlement || b.close,
              is_finalized: true,
              quality_status: 'complete',
              source_id: 'snapshot_auto_recover',
              created_at: new Date(b.timestamp)
            };
          });

          try {
            await db.insert(market_bars).values(valuesToInsert as any).onConflictDoNothing();
            inserted += valuesToInsert.length;
          } catch (e: any) {
            console.warn('[DataSnapshotService] Batch insert note:', e.message);
          }
        }

        console.log(`[DataSnapshotService] Successfully auto-recovered ${inserted} bars from snapshot into market_bars.`);
        return { recoveredCount: inserted };
      }
    } catch (err: any) {
      console.warn('[DataSnapshotService] autoRecoverIfNeeded note:', err.message);
    }

    return { recoveredCount: 0 };
  }
}

export const dataSnapshotService = DataSnapshotService.getInstance();
