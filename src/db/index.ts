import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

declare global {
  var _activeDb: any;
  var _activePool: any;
  var _activePglite: any;
}

// 1. Initialize persistent embedded PostgreSQL via PGlite with auto-recovery
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const dataDir = isServerless ? path.resolve('/tmp', 'pglite') : path.resolve(process.cwd(), 'data', 'pglite');

try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (fsErr: any) {
  console.warn('[DB] Notice on creating dataDir:', fsErr.message);
}

// Remove stale postmaster.pid if present from previous ungraceful termination
const pidPath = path.join(dataDir, 'postmaster.pid');
try {
  if (fs.existsSync(pidPath)) {
    fs.unlinkSync(pidPath);
  }
} catch {}

let activePglite: PGlite;
let pgliteReadyResolve!: () => void;
let pgliteReadyReject!: (err: any) => void;
export const pgliteReadyPromise = new Promise<void>((resolve, reject) => {
  pgliteReadyResolve = resolve;
  pgliteReadyReject = reject;
});

async function initSafePglite(): Promise<PGlite> {
  try {
    const lite = new PGlite(dataDir);
    await lite.waitReady;
    await lite.query('SELECT 1;');
    return lite;
  } catch (err: any) {
    console.warn('[DB] PGlite failed to start on disk cluster, auto-recovering:', err.message);
    try {
      if (fs.existsSync(dataDir)) {
        const backupDir = dataDir + '_backup_' + Date.now();
        try {
          fs.renameSync(dataDir, backupDir);
        } catch {
          fs.rmSync(dataDir, { recursive: true, force: true });
        }
      }
      fs.mkdirSync(dataDir, { recursive: true });
      const lite = new PGlite(dataDir);
      await lite.waitReady;
      await lite.query('SELECT 1;');
      console.log('[DB] Clean PGlite cluster auto-recovered successfully.');
      return lite;
    } catch (recoverErr: any) {
      console.error('[DB] Failed to recover disk PGlite, falling back to memory PGlite:', recoverErr.message);
      const memLite = new PGlite();
      await memLite.waitReady;
      return memLite;
    }
  }
}

// Instantiate initial PGlite or proxy
if (global._activePglite) {
  activePglite = global._activePglite;
  pgliteReadyResolve();
} else {
  // Start initialization immediately
  initSafePglite().then(async (lite) => {
    activePglite = lite;
    global._activePglite = lite;
    pgliteReadyResolve();
    // Auto-verify all tables once healthy instance is up
    try {
      const { ensureAllTables } = await import('./initSchema.js');
      await ensureAllTables();
    } catch (err: any) {
      console.warn('[DB] Auto schema sync note:', err.message);
    }
  }).catch((err) => {
    console.error('[DB] Critical error in PGlite initialization:', err);
    pgliteReadyReject(err);
  });
}

// Proxy for pglite so method calls dynamically forward to the active healthy instance
export const pglite = new Proxy({} as PGlite, {
  get(target, prop, receiver) {
    if (prop === 'waitReady') {
      return pgliteReadyPromise;
    }
    return (...args: any[]) => {
      if (!activePglite) {
        return pgliteReadyPromise.then(() => (activePglite as any)[prop](...args));
      }
      const val = (activePglite as any)[prop];
      if (typeof val === 'function') {
        return val.apply(activePglite, args);
      }
      return val;
    };
  }
});

// Graceful exit handler to cleanly shut down PGlite and prevent data corruption
const cleanupPglite = async () => {
  try {
    if (activePglite) {
      await activePglite.close();
    }
  } catch {}
};
process.on('SIGINT', cleanupPglite);
process.on('SIGTERM', cleanupPglite);
process.on('beforeExit', cleanupPglite);

// 2. Pool adapter wrapping PGlite to fulfill pg.Pool interface seamlessly
const createPglitePoolAdapter = () => ({
  query: async (text: string, params?: any[]) => {
    await pgliteReadyPromise;
    try {
      const res = await activePglite.query(text, params);
      return {
        rows: res.rows || [],
        rowCount: res.affectedRows ?? (res.rows ? res.rows.length : 0),
        fields: res.fields || []
      };
    } catch (err: any) {
      if ((!params || params.length === 0) && (err.message?.includes('cannot insert multiple commands') || text.trim().includes(';'))) {
        await activePglite.exec(text);
        return { rows: [], rowCount: 0, fields: [] };
      }
      throw err;
    }
  },
  connect: async () => {
    await pgliteReadyPromise;
    return {
      query: async (text: string, params?: any[]) => {
        try {
          const res = await activePglite.query(text, params);
          return {
            rows: res.rows || [],
            rowCount: res.affectedRows ?? (res.rows ? res.rows.length : 0),
            fields: res.fields || []
          };
        } catch (err: any) {
          if ((!params || params.length === 0) && (err.message?.includes('cannot insert multiple commands') || text.trim().includes(';'))) {
            await activePglite.exec(text);
            return { rows: [], rowCount: 0, fields: [] };
          }
          throw err;
        }
      },
      release: () => {}
    };
  },
  on: (_event: string, _handler: Function) => {},
  end: async () => {
    await cleanupPglite();
  }
});

// 3. Fallback / selection logic with smart diagnostics
export interface DbDiagnosticInfo {
  configuredUrl: boolean;
  isNeon: boolean;
  activeEngine: 'neon' | 'pglite_local' | 'pglite_local_fallback';
  neonError: string | null;
  neonErrorCode: string | null;
  quotaExceeded: boolean;
  statusMessage: string;
}

export const dbDiagnostic: DbDiagnosticInfo = {
  configuredUrl: Boolean(process.env.DATABASE_URL),
  isNeon: Boolean(process.env.DATABASE_URL?.includes('neon.tech')),
  activeEngine: 'pglite_local',
  neonError: null,
  neonErrorCode: null,
  quotaExceeded: false,
  statusMessage: '本地持久化嵌入式 PostgreSQL (PGlite)'
};

export function getDbDiagnostic(): DbDiagnosticInfo {
  return dbDiagnostic;
}

const pgliteAdapter = createPglitePoolAdapter();
const pgliteDbInstance = drizzlePglite(pglite, { schema });

function getCleanDatabaseUrl(): string | null {
  let raw = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || '';
  if (!raw || typeof raw !== 'string') return null;

  raw = raw.trim();
  // Strip common copy-paste artifacts like "Neon:DATABASE_URL," or "DATABASE_URL=" or wrapping quotes
  raw = raw.replace(/^(Neon:\s*)?DATABASE_URL\s*[,=:\s]\s*/i, '');
  raw = raw.replace(/^["']|["']$/g, '').trim();

  if (!raw.startsWith('postgres://') && !raw.startsWith('postgresql://')) {
    return null;
  }

  // Remove channel_binding=require as standard node-postgres driver does not support SCRAM channel binding option cleanly in query params
  raw = raw.replace(/[?&]channel_binding=[^&]+/g, (match) => match.startsWith('?') ? '?' : '');
  raw = raw.replace(/\?&/g, '?').replace(/[?&]$/g, '');

  return raw;
}

const cleanedDbUrl = getCleanDatabaseUrl();
const useExternalPg = process.env.USE_EXTERNAL_PG !== 'false' && Boolean(cleanedDbUrl);

if (useExternalPg && cleanedDbUrl) {
  const connectionString = cleanedDbUrl;
  const isSsl = connectionString.includes('sslmode=require') || 
                connectionString.includes('neon.tech') || 
                connectionString.includes('supabase');

  const externalPool = new Pool({
    connectionString,
    ssl: isSsl ? { rejectUnauthorized: false } : false,
    max: isServerless ? 5 : 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: isServerless ? 10000 : 30000,
  });

  externalPool.on('error', (err) => {
    console.warn('[DB] Unexpected error on idle SQL pool client:', err.message);
  });

  // 验证远程 Neon 数据库连接连通性及配额状态
  externalPool.query('SELECT 1;').then(async () => {
    console.log('[DB] Successfully connected to remote PostgreSQL (Neon DB).');
    global._activePool = externalPool;
    global._activeDb = drizzlePg(externalPool, { schema });
    dbDiagnostic.activeEngine = 'neon';
    dbDiagnostic.statusMessage = '已成功连接远程 Neon 云数据库';
    try {
      const { ensureAllTables } = await import('./initSchema.js');
      await ensureAllTables();
      const { dataSnapshotService } = await import('../services/dataSnapshotService.js');
      await dataSnapshotService.autoRecoverIfNeeded();
    } catch (e: any) {
      console.warn('[DB] Neon init schema note:', e.message);
    }
  }).catch((err: any) => {
    const isQuota = err.message?.includes('exceeded the data transfer quota') || err.code === '53000';
    console.warn(`[DB] Remote PostgreSQL connection rejected (${err.code || 'ERR'}): ${err.message}.`);
    console.warn('[DB] Seamlessly falling back to local persistent PGlite cluster to safeguard data and prevent downtime.');
    dbDiagnostic.activeEngine = 'pglite_local_fallback';
    dbDiagnostic.neonError = err.message;
    dbDiagnostic.neonErrorCode = err.code || '53000';
    dbDiagnostic.quotaExceeded = isQuota;
    dbDiagnostic.statusMessage = isQuota 
      ? '远程 Neon 数据库免费月度流量已超额熔断 (Neon Error 53000)，系统已自动降级至本地持久化数据库保障量化运行与数据安全'
      : `远程数据库连接失败 (${err.message})，系统已自动降级至本地持久化数据库`;
  });
}

// Smart proxy routing to active pool and active db
export const pool: any = new Proxy({} as any, {
  get(target, prop) {
    const active = global._activePool || pgliteAdapter;
    const val = active[prop];
    if (typeof val === 'function') {
      return val.bind(active);
    }
    return val;
  }
});

export const db: any = new Proxy({} as any, {
  get(target, prop) {
    const active = global._activeDb || pgliteDbInstance;
    const val = active[prop];
    if (typeof val === 'function') {
      return val.bind(active);
    }
    return val;
  }
});

// Helper to safely check database connectivity and initialize tables
export async function checkDbConnection(): Promise<boolean> {
  try {
    if (dbDiagnostic.activeEngine === 'neon' && global._activePool) {
      await global._activePool.query('SELECT 1;');
    } else {
      await pgliteReadyPromise;
    }
    const { ensureAllTables } = await import('./initSchema.js');
    await ensureAllTables();
    return true;
  } catch (error) {
    console.warn('[DB] Connection check / table auto-init note:', (error as Error).message);
    return false;
  }
}

export default db;
export * from './schema.js';
export { ensureAllTables } from './initSchema.js';

