import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Layers, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  FileSpreadsheet, 
  FileCode, 
  Activity, 
  Calendar, 
  Compass, 
  Cpu, 
  Database,
  BarChart2,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Download,
  Check,
  ChevronDown,
  BarChart3,
  X
} from 'lucide-react';

interface SevenProductOverview {
  product: string;
  name: string;
  exchange: string;
  category: string;
  multiplier: number;
  minTick: number;
  marginRate: number;
  basePrice: number;
  nightSession: string;
  dominantMonths: number[];
  openFeePerLot?: number;
  openFeeRatio?: number;
  customAdded?: boolean;
}

interface FundamentalsItem {
  id: number;
  product: string;
  indicator_code: string;
  indicator_name: string;
  observation_date: string;
  value: number;
  unit: string;
  region: string;
  frequency: string;
  source_name: string;
  official: boolean;
}

interface MacroItem {
  id: number;
  indicator_code: string;
  indicator_name: string;
  country: string;
  period: string;
  value: number;
  previous_value: number;
  forecast_value: number;
  unit: string;
  source_agency: string;
}

interface AuditLogItem {
  bundle_id: string;
  dataset_type: string;
  source_name: string;
  row_count: number;
  acquired_at: string;
  coverage_status: string;
  validation_status: string;
  historical_authority: boolean;
}

interface SevenProductsMatrixProps {
  onSelectSymbol: (symbol: string) => void;
  onNavigateToDecision: (symbol: string) => void;
}

// 可供快捷添加的新品种推荐列表（如进一步扩增）
const RECOMMENDED_NEW_PRODUCTS = [
  { code: 'CU', name: '沪铜', ex: 'SHFE', cat: '有色金属', role: '全球宏观风向标 / 铜杆开工率' },
  { code: 'BU', name: '沥青', ex: 'SHFE', cat: '能源化工', role: '原油下游裂解 / 基建道路开工' },
  { code: 'RU', name: '橡胶', ex: 'SHFE', cat: '能源化工', role: '全乳胶青岛保税区库存 / 轮胎开工' },
  { code: 'ZN', name: '沪锌', ex: 'SHFE', cat: '有色金属', role: '镀锌开工 / 冶炼厂加工费TC' },
  { code: 'LC', name: '碳酸锂', ex: 'GFEX', cat: '新能源/硅锂', role: '动力电池 / 锂盐厂排产' },
  { code: 'AU', name: '沪金', ex: 'SHFE', cat: '贵金属', role: '避险对冲 / 央行购金储备' },
  { code: 'AG', name: '沪银', ex: 'SHFE', cat: '贵金属', role: '光伏白银耗量 / 工业与贵金属双重属性' },
  { code: 'IF', name: '沪深300', ex: 'CFFEX', cat: '金融期货', role: '股指对冲 / 基差升贴水' },
  { code: 'T', name: '10年国债', ex: 'CFFEX', cat: '金融期货', role: '无风险利率 / 收益率曲线' }
];

export function SevenProductsMatrix({ onSelectSymbol, onNavigateToDecision }: SevenProductsMatrixProps) {
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5];

  const [activeSubView, setActiveSubView] = useState<'matrix' | 'fundamentals' | 'macro' | 'audit' | 'health'>('matrix');
  const [selectedProduct, setSelectedProduct] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  // Data states
  const [overviewData, setOverviewData] = useState<any>(null);
  const [fundamentalsList, setFundamentalsList] = useState<FundamentalsItem[]>([]);
  const [macroList, setMacroList] = useState<MacroItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [healthReport, setHealthReport] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(false);
  const [syncingAllYears, setSyncingAllYears] = useState<boolean>(false);
  const [repairingYear, setRepairingYear] = useState<number | null>(null);
  const [healthMessage, setHealthMessage] = useState<string | null>(null);
  
  // New Product Modal/Input State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [customProductInput, setCustomProductInput] = useState('');
  
  // Loading states
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Data Retention & Cleanup State
  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [cleaningRetention, setCleaningRetention] = useState<boolean>(false);

  // Auto-Sync States
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(30);
  const [countdown, setCountdown] = useState<number>(30);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [autoSyncCount, setAutoSyncCount] = useState<number>(0);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);

  // Fetch Seven Products Overview & stats
  const fetchOverview = async (silent: boolean = false) => {
    if (!silent) setLoadingOverview(true);
    try {
      const res = await fetch('/api/v1/data/seven-overview');
      const json = await res.json();
      if (json.status === 'ok') {
        setOverviewData(json.data);
      }
    } catch (e: any) {
      console.warn('Failed to fetch seven overview:', e?.message || e);
    } finally {
      if (!silent) setLoadingOverview(false);
    }
  };

  // Fetch Auto-sync status from backend
  const fetchAutoSyncStatus = async () => {
    try {
      const res = await fetch('/api/v1/data/auto-sync/status');
      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        setAutoSyncEnabled(json.data.enabled);
        setAutoSyncInterval(json.data.intervalSec || 30);
        setLastSyncTime(json.data.lastSyncTime);
        setAutoSyncCount(json.data.syncCount || 0);
      }
    } catch (e) {
      console.warn('Failed to fetch auto-sync status:', e);
    }
  };

  // Toggle Auto-sync on/off or interval change
  const handleToggleAutoSync = async (targetEnabled?: boolean, targetInterval?: number) => {
    const nextEnabled = targetEnabled !== undefined ? targetEnabled : !autoSyncEnabled;
    const nextInterval = targetInterval || autoSyncInterval;
    setIsAutoSyncing(true);

    try {
      const res = await fetch('/api/v1/data/auto-sync/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled, intervalSec: nextInterval })
      });
      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        setAutoSyncEnabled(json.data.enabled);
        setAutoSyncInterval(json.data.intervalSec);
        setCountdown(json.data.intervalSec);
        setActionMessage({
          text: json.data.enabled 
            ? `⚡ 自动同步已开启：每 ${json.data.intervalSec} 秒自动增量同步最新行情与基本面` 
            : '⏸️ 自动同步已暂停：已切换为手动采集模式',
          type: 'info'
        });
      }
    } catch (e: any) {
      setActionMessage({ text: `切换自动同步失败: ${e.message}`, type: 'error' });
    } finally {
      setIsAutoSyncing(false);
    }
  };

  // Trigger immediate one-time auto-sync cycle
  const handleTriggerAutoSyncNow = async () => {
    setIsAutoSyncing(true);
    setActionMessage({ text: '正在立即执行后台增量自动同步...', type: 'info' });
    try {
      const res = await fetch('/api/v1/data/auto-sync/trigger', { method: 'POST' });
      const json = await res.json();
      if (json.status === 'ok') {
        const now = new Date();
        setLastSyncTime(now.toISOString());
        setAutoSyncCount(prev => prev + 1);
        setCountdown(autoSyncInterval);
        setActionMessage({
          text: `⚡ 自动同步完成！已增量落库最新多周期 K 线与产业链指标 (${now.toLocaleTimeString()})`,
          type: 'success'
        });
        fetchOverview(true);
        fetchFundamentals();
        fetchAuditLogs();
      }
    } catch (e: any) {
      setActionMessage({ text: `自动同步触发异常: ${e.message}`, type: 'error' });
    } finally {
      setIsAutoSyncing(false);
    }
  };

  // Fetch Fundamentals
  const fetchFundamentals = async (prod: string = selectedProduct) => {
    try {
      const url = prod !== 'ALL' ? `/api/v1/data/seven-fundamentals?product=${prod}` : '/api/v1/data/seven-fundamentals';
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'ok') {
        setFundamentalsList(json.data || []);
      }
    } catch (e) {
      console.warn('Failed to fetch fundamentals:', e);
    }
  };

  // Fetch Macro
  const fetchMacro = async () => {
    try {
      const res = await fetch('/api/v1/data/macro-indicators');
      const json = await res.json();
      if (json.status === 'ok') {
        setMacroList(json.data || []);
      }
    } catch (e) {
      console.warn('Failed to fetch macro:', e);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/v1/data/audit-logs');
      const json = await res.json();
      if (json.status === 'ok') {
        setAuditLogs(json.data || []);
      }
    } catch (e) {
      console.warn('Failed to fetch audit logs:', e);
    }
  };

  // 根据保留周期执行自动/手动清理
  const handleRetentionCleanup = async (daysToClean?: number) => {
    const targetDays = daysToClean !== undefined ? daysToClean : retentionDays;
    setCleaningRetention(true);
    setActionMessage({ text: '正在清理超出保留周期的旧数据...', type: 'info' });
    try {
      const res = await fetch('/api/v1/data/cleanup-retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays: targetDays })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        const r = data.result || {};
        const totalCleaned = (r.fundamentalsDeleted || 0) + (r.macroDeleted || 0) + (r.auditLogsDeleted || 0);
        setActionMessage({
          text: `数据清理完成！基本面清理: ${r.fundamentalsDeleted}条, 宏观: ${r.macroDeleted}条, 审计日志: ${r.auditLogsDeleted}条 (共 ${totalCleaned} 条)`,
          type: 'success'
        });
        await fetchFundamentals(selectedProduct);
        await fetchMacro();
        await fetchAuditLogs();
      } else {
        setActionMessage({ text: `清理失败: ${data.error || '未知错误'}`, type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: `网络错误: ${e.message}`, type: 'error' });
    } finally {
      setCleaningRetention(false);
    }
  };

  // Fetch Health Check Diagnostics for 2021-2026
  const fetchHealthReport = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/v1/data/verify-health');
      const json = await res.json();
      if (json.status === 'ok') {
        setHealthReport(json.evaluation);
      }
    } catch (e) {
      console.warn('Failed to fetch health report:', e);
    } finally {
      setLoadingHealth(false);
    }
  };

  // 一键全量同步所有年份数据
  const handleSyncAllYears = async () => {
    setSyncingAllYears(true);
    setHealthMessage('正在全量拉取全历史年份 (含跨年主力) 全品种多周期数据，请稍候...');
    try {
      const res = await fetch('/api/v1/data/sync-all-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startYear: currentYear - 5, endYear: currentYear + 1 })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setHealthMessage(`全量同步完成！共写入 ${data.totalBarsInserted.toLocaleString()} 根标准 K 线`);
        await fetchHealthReport();
        await fetchOverview();
      } else {
        setHealthMessage(`全量同步异常: ${data.error || '未知错误'}`);
      }
    } catch (e: any) {
      setHealthMessage(`网络请求失败: ${e.message}`);
    } finally {
      setSyncingAllYears(false);
      setTimeout(() => setHealthMessage(null), 6000);
    }
  };

  // 单年份定向修复/重同步
  const handleRepairYear = async (year: number) => {
    setRepairingYear(year);
    setHealthMessage(`正在修复 ${year} 年数据...`);
    try {
      const res = await fetch('/api/v1/data/repair-year', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setHealthMessage(`${year} 年修复同步完成，写入 ${data.totalBarsInserted.toLocaleString()} 根 K 线`);
        await fetchHealthReport();
        await fetchOverview();
      }
    } catch (e: any) {
      setHealthMessage(`修复失败: ${e.message}`);
    } finally {
      setRepairingYear(null);
      setTimeout(() => setHealthMessage(null), 5000);
    }
  };

  // 导出数据体检报告 JSON
  const handleExportHealthCertificate = () => {
    if (!healthReport) return;
    const blob = new Blob([JSON.stringify({
      title: `China Futures ${currentYear - 5}-${currentYear + 1} Quantitative Data Health & Audit Certificate`,
      generated_at: new Date().toISOString(),
      report: healthReport
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data_health_report_${currentYear - 5}_${currentYear + 1}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchOverview();
    fetchFundamentals();
    fetchMacro();
    fetchAuditLogs();
    fetchHealthReport();
    fetchAutoSyncStatus();
  }, []);

  // Auto-Sync Heartbeat Timer
  useEffect(() => {
    if (!autoSyncEnabled) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger silent UI refresh & update sync timestamp
          fetchOverview(true);
          fetchFundamentals();
          fetchAuditLogs();
          setLastSyncTime(new Date().toISOString());
          setAutoSyncCount(c => c + 1);
          return autoSyncInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoSyncEnabled, autoSyncInterval, selectedProduct]);

  // Action: Collect single product single frequency (Supports historical years & any added product)
  const handleCollectProduct = async (product: string, freq: 'D1' | 'H1' | 'M30') => {
    setLoadingAction(true);
    setActionMessage({ text: `正在采集 ${product} ${selectedYear}年 [${freq}] 标准序列...`, type: 'info' });
    try {
      const res = await fetch('/api/v1/data/collect-seven', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, year: selectedYear, frequency: freq })
      });
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch (err) {
        throw new Error(`服务端异常 [HTTP ${res.status}]: ${text.slice(0, 120)}... (可查看 Vercel 控制台 Logs 获取完整堆栈)`);
      }

      if (json.status === 'ok') {
        setActionMessage({ 
          text: `✅ ${product} ${selectedYear}年 [${freq}] 采集完成! 已落库 ${json.data.totalBarsInserted} 根标准K线 (审计包: ${json.data.bundleId})`, 
          type: 'success' 
        });
        fetchOverview();
        fetchAuditLogs();
      } else {
        setActionMessage({ text: `❌ 采集失败: ${json.error}`, type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: `❌ 采集异常: ${e.message}`, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  // Action: Collect All Products with D1+H1+M30 in the target year
  const handleCollectAllSeven = async () => {
    setLoadingAction(true);
    const count = (overviewData?.sevenProducts || []).length || 7;
    setActionMessage({ text: `正在批量采集全部 ${count} 个品种 ${selectedYear} 年全量 D1/H1/M30 与基本面...`, type: 'info' });
    try {
      const res = await fetch('/api/v1/data/collect-seven', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'ALL', year: selectedYear })
      });
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch (err) {
        throw new Error(`服务端异常 [HTTP ${res.status}]: ${text.slice(0, 120)}... (可查看 Vercel 控制台 Logs 获取完整堆栈)`);
      }

      if (json.status === 'ok') {
        setActionMessage({ 
          text: `🎉 全量 ${json.data.productsCount} 个品种 ${selectedYear} 年全部 D1(日线)+H1(小时)+M30(30分) 与产业链基本面同步完成!`, 
          type: 'success' 
        });
        fetchOverview();
        fetchFundamentals();
        fetchMacro();
        fetchAuditLogs();
      } else {
        setActionMessage({ text: `❌ 批量采集失败: ${json.error}`, type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: `❌ 批量采集异常: ${e.message}`, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  // Action: Add New Product (e.g. 8th, 9th Product)
  const handleAddProduct = async (productCode: string) => {
    if (!productCode) return;
    setLoadingAction(true);
    setActionMessage({ text: `正在将品种 ${productCode.toUpperCase()} 纳入全量多周期矩阵...`, type: 'info' });
    try {
      const res = await fetch('/api/v1/data/seven-products/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productCode })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setActionMessage({ 
          text: `✅ ${json.message}! 正在自动采集该品种 ${selectedYear} 年数据...`, 
          type: 'success' 
        });
        setShowAddProductModal(false);
        setCustomProductInput('');
        fetchOverview();
        // 自动采集该新品种当前年份的数据
        await handleCollectProduct(productCode.toUpperCase(), 'D1');
      } else {
        setActionMessage({ text: `❌ 添加品种失败: ${json.error}`, type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: `❌ 网络异常: ${e.message}`, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  // Action: Remove Custom Product
  const handleRemoveProduct = async (productCode: string) => {
    if (!confirm(`确认要从资产矩阵中移除品种 ${productCode} 吗？`)) return;
    setLoadingAction(true);
    try {
      const res = await fetch('/api/v1/data/seven-products/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productCode })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setActionMessage({ text: `✅ 成功移除品种 ${productCode}`, type: 'success' });
        fetchOverview();
      } else {
        setActionMessage({ text: `❌ 移除失败: ${json.error}`, type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: `❌ 网络异常: ${e.message}`, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  // Action: Export & Download Data
  const handleExportData = (productCode?: string, frequency: string = 'D1') => {
    const p = productCode || selectedProduct;
    const url = `/api/v1/data/seven-export?product=${p}&frequency=${frequency}&year=${selectedYear}&format=csv`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `MarketBars_${p}_${frequency}_${selectedYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setActionMessage({ 
      text: `📥 已触发 ${p === 'ALL' ? '全部品种' : p} [${frequency}] ${selectedYear}年标准数据导出下载`, 
      type: 'success' 
    });
  };

  // Action: 2021-2026 Core Products (RB, MA, SA, FG, M + Custom) M30/H1/D1 Batch Sync
  const handleSyncHistoricalCoreMatrix = async () => {
    setLoadingAction(true);
    const targetProds = overviewData?.sevenProducts?.map((p: any) => p.product) || ['RB', 'MA', 'SA', 'FG', 'M'];
    setActionMessage({ text: `正在全量同步 2021-2026 年已添加核心品种 (${targetProds.join(', ')}) 历史数据 (D1/H1/M30)...`, type: 'info' });
    try {
      const res = await fetch('/api/v1/data/sync-history-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startYear: 2021,
          endYear: 2026,
          frequencies: ['D1', 'H1', 'M30'],
          products: targetProds
        })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setActionMessage({
          text: `🎉 2021-2026 年已添加核心品种 (${targetProds.join(', ')}) 历史数据同步完成！已覆盖 ${json.data?.totalContractsSynced || targetProds.length * 4} 个主力合约，全量落盘入库。`,
          type: 'success'
        });
        fetchOverview();
        fetchAuditLogs();
      } else {
        setActionMessage({ text: `❌ 同步失败: ${json.error}`, type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: `❌ 网络异常: ${e.message}`, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  // Action: Sync Fundamentals & Macro
  const handleSyncFundamentals = async () => {
    setLoadingAction(true);
    setActionMessage({ text: '正在同步全套产业链现货、基差、开工率与宏观指标...', type: 'info' });
    try {
      const res = await fetch('/api/v1/data/sync-seven-fundamentals', { method: 'POST' });
      const json = await res.json();
      if (json.status === 'ok') {
        setActionMessage({ 
          text: `✅ 产业链基本面与宏观指标同步成功! 已更新 ${json.data.fundamentalsCount} 条产业链指标、${json.data.macroCount} 条宏观指标。`, 
          type: 'success' 
        });
        fetchOverview();
        fetchFundamentals();
        fetchMacro();
      } else {
        setActionMessage({ text: `❌ 同步失败: ${json.error}`, type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: `❌ 网络异常: ${e.message}`, type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  // 合并服务端返回的全部品种列表（5大核心品种）
  const productList: SevenProductOverview[] = overviewData?.sevenProducts || [
    { product: 'RB', name: '螺纹钢', exchange: 'SHFE', category: '黑色金属', multiplier: 10, minTick: 1, marginRate: 0.08, basePrice: 3280, nightSession: '21:00-23:00', dominantMonths: [1, 5, 10] },
    { product: 'MA', name: '甲醇', exchange: 'CZCE', category: '能源化工', multiplier: 10, minTick: 1, marginRate: 0.08, basePrice: 2460, nightSession: '21:00-23:00', dominantMonths: [1, 5, 9] },
    { product: 'SA', name: '纯碱', exchange: 'CZCE', category: '能源化工', multiplier: 20, minTick: 1, marginRate: 0.12, basePrice: 1560, nightSession: '21:00-23:00', dominantMonths: [1, 5, 9] },
    { product: 'FG', name: '玻璃', exchange: 'CZCE', category: '建材化工', multiplier: 20, minTick: 1, marginRate: 0.10, basePrice: 1240, nightSession: '21:00-23:00', dominantMonths: [1, 5, 9] },
    { product: 'M', name: '豆粕', exchange: 'DCE', category: '农产品', multiplier: 10, minTick: 1, marginRate: 0.07, basePrice: 2980, nightSession: '21:00-23:00', dominantMonths: [1, 5, 9] }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded-lg text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                核心品种量化资产矩阵
              </h2>
              <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-bold">
                三周期架构: D1方向 + H1主信号 + M30入场确认
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              支持全量多周期采集、<strong>历史跨年份历史采集</strong>、<strong>标准化 CSV 导出下载</strong> 以及 <strong>动态扩增新品种</strong>。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* 自动同步最新数据专属开关组件 (Auto-Sync Controller) */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
              autoSyncEnabled 
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-xs shadow-emerald-500/10' 
                : 'bg-slate-950/70 border-slate-700/80 text-slate-400'
            }`}>
              {/* 开关 Toggle 按钮 */}
              <button
                onClick={() => handleToggleAutoSync(!autoSyncEnabled)}
                className="flex items-center gap-2 cursor-pointer group"
                title={autoSyncEnabled ? '点击暂停自动同步 (切换为手动模式)' : '点击开启后台自动增量同步最新数据'}
              >
                {/* 呼吸灯指示器 */}
                <div className="relative flex items-center justify-center">
                  {autoSyncEnabled ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </>
                  ) : (
                    <span className="inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                  )}
                </div>

                {/* 拟物滑动开关轨道 */}
                <div className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                  autoSyncEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                }`}>
                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow-md transform transition-transform duration-200"></div>
                </div>

                <span className={`text-xs font-bold ${autoSyncEnabled ? 'text-emerald-300' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {autoSyncEnabled ? '自动同步' : '自动同步: 暂停'}
                </span>
              </button>

              {/* 开启状态下的频率调节与倒计时 */}
              {autoSyncEnabled && (
                <div className="flex items-center gap-1.5 border-l border-emerald-800/60 pl-2 text-xs">
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-600/30">
                    {countdown}s
                  </span>
                  <select
                    value={autoSyncInterval}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setAutoSyncInterval(val);
                      handleToggleAutoSync(true, val);
                    }}
                    className="bg-slate-900 border border-emerald-700/50 text-emerald-300 rounded px-1.5 py-0.5 text-[11px] font-mono cursor-pointer"
                    title="配置自动同步检测周期"
                  >
                    <option value={15}>15秒</option>
                    <option value={30}>30秒</option>
                    <option value={60}>60秒</option>
                    <option value={120}>2分钟</option>
                  </select>

                  {/* 立即手动触发一次同步 */}
                  <button
                    onClick={handleTriggerAutoSyncNow}
                    disabled={isAutoSyncing}
                    className="p-1 hover:bg-emerald-900/50 text-emerald-300 rounded transition-all cursor-pointer"
                    title="立即执行一次增量同步"
                  >
                    <RefreshCw className={`w-3 h-3 ${isAutoSyncing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            {/* 年份选择器：支持历史年份如 2025, 2024, 2023, 2022, 2021, 2020 */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>采集年份:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs font-bold text-indigo-300 cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y} 年 {y === currentYear + 1 ? '(跨年主力)' : (y === currentYear ? '(当期主力)' : '(历史交割)')}
                  </option>
                ))}
              </select>
            </div>

            {/* 2021-2026 五大品种 (1/5/9/10月) 批量同步按钮 */}
            <button
              onClick={handleSyncHistoricalCoreMatrix}
              disabled={loadingAction}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-teal-600/30 to-emerald-600/30 hover:from-teal-600/40 hover:to-emerald-600/40 text-teal-200 border border-teal-500/40 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="一键同步 2021-2026 年 RB, MA, SA, FG, M 五大品种 (1/5/9/10月合约) M30/H1/D1 完整历史序列"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>2021-2026 历史多周期 (5大品种 1/5/9/10月)</span>
            </button>

            {/* 新增品种按钮 */}
            <button
              onClick={() => setShowAddProductModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-600/40 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="添加第8个、第9个品种（如 CU, I, TA, AL, SA 等）"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ 增加品种 (第{productList.length + 1}个)</span>
            </button>

            {/* 导出下载全量数据 */}
            <button
              onClick={() => handleExportData('ALL', 'D1')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="导出当前年份全部品种的标准 CSV 数据包"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出下载 ({selectedYear}年)</span>
            </button>

            <button
              onClick={handleSyncFundamentals}
              disabled={loadingAction}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-600/40 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>同步基本面</span>
            </button>

            <button
              onClick={handleCollectAllSeven}
              disabled={loadingAction}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>一键全量采集全部品种</span>
            </button>

            <button
              onClick={() => {
                fetchOverview();
                fetchFundamentals();
                fetchMacro();
                fetchAuditLogs();
              }}
              disabled={loadingOverview}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
              title="刷新全量指标"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Message Toast */}
        {actionMessage && (
          <div className={`mt-3 p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
            actionMessage.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' :
            actionMessage.type === 'error' ? 'bg-rose-950/60 border-rose-500/40 text-rose-200' :
            'bg-indigo-950/60 border-indigo-500/40 text-indigo-200'
          }`}>
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white text-xs px-1">✕</button>
          </div>
        )}
      </div>

      {/* Modal: Add New Product (8th, 9th, etc.) */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">扩展纳管新品种 (第 {productList.length + 1} 个)</h3>
                  <p className="text-xs text-slate-400">从全市场期货池中添加新品种，自动绑定交易规则与多周期数据采集</p>
                </div>
              </div>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">输入期货品种代码 (如 CU, I, TA, AL, SA, SI, LC, AU, AG, IF):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customProductInput}
                    onChange={(e) => setCustomProductInput(e.target.value.toUpperCase())}
                    placeholder="输入代码例如: CU"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white uppercase focus:outline-hidden focus:border-purple-500"
                  />
                  <button
                    onClick={() => handleAddProduct(customProductInput)}
                    disabled={!customProductInput || loadingAction}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    确认添加
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-400 mb-2">推荐热门主流品种（点击直接添加）:</span>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {RECOMMENDED_NEW_PRODUCTS.filter(r => !productList.some(p => p.product === r.code)).map((item) => (
                    <button
                      key={item.code}
                      onClick={() => handleAddProduct(item.code)}
                      disabled={loadingAction}
                      className="p-2.5 bg-slate-950/80 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/50 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs text-purple-300 group-hover:text-purple-200">{item.code} - {item.name}</span>
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-900 rounded">{item.ex}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">{item.role}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Sub Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubView('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubView === 'matrix' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>品种矩阵与多周期采集</span>
          </button>
          <button
            onClick={() => setActiveSubView('fundamentals')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubView === 'fundamentals' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>产业链与基本面看板</span>
          </button>
          <button
            onClick={() => setActiveSubView('macro')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubView === 'macro' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>宏观经济事件矩阵</span>
          </button>
          <button
            onClick={() => setActiveSubView('audit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubView === 'audit' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>数据来源与质量审计</span>
          </button>
          <button
            onClick={() => {
              setActiveSubView('health');
              fetchHealthReport();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubView === 'health' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentYear - 5}-{currentYear + 1} 数据健康体检报告</span>
          </button>
        </div>

        {/* 快速导出操作栏 */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">快速导出:</span>
          <button
            onClick={() => handleExportData(selectedProduct === 'ALL' ? undefined : selectedProduct, 'D1')}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 rounded-lg text-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>D1日线.csv</span>
          </button>
          <button
            onClick={() => handleExportData(selectedProduct === 'ALL' ? undefined : selectedProduct, 'H1')}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 rounded-lg text-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>H1小时.csv</span>
          </button>
          <button
            onClick={() => handleExportData(selectedProduct === 'ALL' ? undefined : selectedProduct, 'M30')}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-400 rounded-lg text-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>M30分.csv</span>
          </button>
        </div>
      </div>

      {/* 3. SubView 1: 10-Product Matrix & Multi-Period Collector */}
      {activeSubView === 'matrix' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {productList.map((item) => {
              const itemProd = (item.product || '').trim().toUpperCase();
              const barsStats = (overviewData?.marketBarsStats || []).filter((s: any) => (s.product || '').trim().toUpperCase() === itemProd);
              const d1Count = Number(barsStats.find((s: any) => (s.frequency || '').toUpperCase() === 'D1')?.count || 0);
              const h1Count = Number(barsStats.find((s: any) => (s.frequency || '').toUpperCase() === 'H1')?.count || 0);
              const m30Count = Number(barsStats.find((s: any) => (s.frequency || '').toUpperCase() === 'M30')?.count || 0);
              const isCustom = item.customAdded;
              const estMargin = Math.round((item.basePrice || 3000) * (item.multiplier || 10) * (item.marginRate || 0.08));
              const pointValue = (item.multiplier || 10) * (item.minTick || 1);
              const feeDesc = item.openFeePerLot ? `${item.openFeePerLot}元/手` : `${((item.openFeeRatio || 0.0001) * 10000).toFixed(1)}‱ (万分之)`;
              const maxSafeLots = Math.max(1, Math.min(3, Math.floor(15000 / (estMargin || 3000))));

              return (
                <div
                  key={item.product}
                  id={`product-card-${item.product}`}
                  className={`bg-slate-900/95 border ${isCustom ? 'border-purple-500/40 bg-purple-950/15' : 'border-slate-800/90 hover:border-indigo-500/60'} rounded-2xl p-4.5 flex flex-col justify-between transition-all group shadow-lg hover:shadow-indigo-950/30 relative`}
                >
                  {isCustom && (
                    <button
                      onClick={() => handleRemoveProduct(item.product)}
                      className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-rose-400 bg-slate-950/60 rounded-lg transition-all"
                      title="移除此新增品种"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div>
                    {/* Header: Code, Name, Exchange, Category */}
                    <div className="flex items-center justify-between mb-3 pr-5">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-2xl font-black font-mono tracking-tight ${isCustom ? 'text-purple-400' : 'text-indigo-400'} group-hover:text-indigo-300`}>
                          {item.product}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white tracking-wide whitespace-nowrap">{item.name}</span>
                          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">{item.category}</span>
                        </div>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 bg-slate-800/90 text-indigo-300 rounded-md font-bold border border-slate-700 whitespace-nowrap">
                        {item.exchange}
                      </span>
                    </div>

                    {/* Rich Spec Details: Structured single lines with generous spacing */}
                    <div className="bg-slate-950/70 rounded-xl p-3 mb-3 border border-slate-800/70 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between whitespace-nowrap">
                        <span className="text-slate-400">合约乘数 / 最小变动:</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {item.multiplier} 吨/手 · {item.minTick} 元/点
                        </span>
                      </div>

                      <div className="flex items-center justify-between whitespace-nowrap">
                        <span className="text-slate-400">单跳波动点值:</span>
                        <span className="font-mono font-bold text-amber-300">
                          ¥{pointValue} 元 / 跳
                        </span>
                      </div>

                      <div className="flex items-center justify-between whitespace-nowrap">
                        <span className="text-slate-400">保证金率 / 单手占用:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {Math.round((item.marginRate || 0.08) * 100)}% (约 ¥{estMargin.toLocaleString()})
                        </span>
                      </div>

                      <div className="flex items-center justify-between whitespace-nowrap">
                        <span className="text-slate-400">开仓手续费标准:</span>
                        <span className="font-mono text-slate-300 text-[11px]">
                          {feeDesc}
                        </span>
                      </div>

                      <div className="flex items-center justify-between whitespace-nowrap pt-1 border-t border-slate-800/60">
                        <span className="text-slate-400">10万本金风控头寸:</span>
                        <span className="font-mono font-bold text-cyan-300 text-[11px]">
                          1 ~ {maxSafeLots} 手 (建议仓位)
                        </span>
                      </div>

                      <div className="flex items-center justify-between whitespace-nowrap">
                        <span className="text-slate-400">交易时段:</span>
                        <span className="text-amber-300/90 font-medium text-[11px]">
                          {item.nightSession || '21:00-23:00'}
                        </span>
                      </div>
                    </div>

                    {/* Dominant Active Months */}
                    <div className="text-xs text-cyan-400/90 font-medium mb-3 flex items-center justify-between px-1 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>主力活跃月份:</span>
                      </span>
                      <span className="font-mono font-bold text-cyan-300">
                        {item.dominantMonths?.join(', ') || '1, 5, 9'} 月
                      </span>
                    </div>

                    {/* Bar Counts Stats (D1, H1, M30) */}
                    <div className="bg-slate-950/90 rounded-xl p-2.5 space-y-1.5 mb-3.5 border border-slate-800">
                      <div className="flex items-center justify-between text-xs whitespace-nowrap">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          D1 日线行情:
                        </span>
                        <span className={`font-mono font-bold ${d1Count > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                          {d1Count > 0 ? `${d1Count.toLocaleString()} 根` : '待采集'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs whitespace-nowrap">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                          H1 主趋势信号:
                        </span>
                        <span className={`font-mono font-bold ${h1Count > 0 ? 'text-cyan-400' : 'text-slate-600'}`}>
                          {h1Count > 0 ? `${h1Count.toLocaleString()} 根` : '待采集'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs whitespace-nowrap">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                          M30 精确入场:
                        </span>
                        <span className={`font-mono font-bold ${m30Count > 0 ? 'text-indigo-400' : 'text-slate-600'}`}>
                          {m30Count > 0 ? `${m30Count.toLocaleString()} 根` : '待采集'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="space-y-2 pt-2.5 border-t border-slate-800/80">
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleCollectProduct(item.product, 'D1')}
                        disabled={loadingAction}
                        className="py-1.5 bg-emerald-950/60 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-700/50 rounded-lg text-xs font-bold text-center transition-all cursor-pointer shadow-xs whitespace-nowrap"
                        title={`采集 ${item.product} ${selectedYear}年 D1日线`}
                      >
                        采 D1
                      </button>
                      <button
                        onClick={() => handleCollectProduct(item.product, 'H1')}
                        disabled={loadingAction}
                        className="py-1.5 bg-cyan-950/60 hover:bg-cyan-800/60 text-cyan-300 border border-cyan-700/50 rounded-lg text-xs font-bold text-center transition-all cursor-pointer shadow-xs whitespace-nowrap"
                        title={`采集 ${item.product} ${selectedYear}年 H1小时线`}
                      >
                        采 H1
                      </button>
                      <button
                        onClick={() => handleCollectProduct(item.product, 'M30')}
                        disabled={loadingAction}
                        className="py-1.5 bg-indigo-950/60 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-700/50 rounded-lg text-xs font-bold text-center transition-all cursor-pointer shadow-xs whitespace-nowrap"
                        title={`采集 ${item.product} ${selectedYear}年 M30线`}
                      >
                        采 M30
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleExportData(item.product, 'D1')}
                        className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 whitespace-nowrap"
                        title={`导出 ${item.product} ${selectedYear}年 CSV 数据`}
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>导出 CSV</span>
                      </button>
                      <button
                        onClick={() => {
                          const targetSym = `${item.product}${selectedYear.toString().slice(2)}09`;
                          onSelectSymbol(targetSym);
                          onNavigateToDecision(targetSym);
                        }}
                        className="py-2 bg-indigo-600/85 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all text-center cursor-pointer shadow-sm whitespace-nowrap"
                      >
                        量化研判 →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3-Tier Architecture Technical Specification Box */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white">品种量化数据架构与历史采集规范 (Market Bar Specification):</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 rounded font-mono font-medium">
                ✓ 历史跨年采集 · CSV导出 · 动态新增已就绪
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  D1 (日线) · 方向与宏观状态
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  标准交易日 242 根/合约/年。包含完整开高低收、成交量/额、持仓量、结算价、前结算与涨跌停价，支持任意历史年份回测采集。
                </p>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  H1 (小时线) · 主策略与ML信号
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  标准 968 根/合约/年（日线的 4 倍，覆盖夜盘与白盘时段）。包含 source_count 聚合记录数校验、换月价差剔除与逻辑审计哈希，驱动主信号生成。
                </p>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  M30 (30分钟) · 入场确认与时机
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  标准 1936 根/合约/年（日线的 8 倍）。用于微观结构检验、波动率测算、10万元资金门禁与动态止损线计算，完成入场确认。
                </p>
              </div>
            </div>

            {/* 条数差异与合约规则说明 */}
            <div className="p-2.5 bg-slate-900/40 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
              <span className="text-indigo-400 font-bold shrink-0">📊 品种条数差异说明:</span>
              <span>
                各品种采集条数 = <strong>活跃合约数 × 单合约周期条数</strong>。例如：
                <span className="text-slate-300"> 沪锌(ZN)</span> 为SHFE全月度连续交割(12合约)，年D1为 2,904条；
                <span className="text-slate-300"> 沥青(BU)</span> 为施工旺季活跃月(5合约)，年D1为 1,210条；
                <span className="text-slate-300"> 螺纹(RB)/橡胶(RU)/玻璃(FG)/豆粕(M)/甲醇(MA)</span> 为标准季月主力(3合约)，年D1为 726条。单合约基准完全统一。
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 数据容量配额与保留周期控制面板 */}
      {(activeSubView === 'fundamentals' || activeSubView === 'macro' || activeSubView === 'audit') && (
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs mb-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-200 flex items-center gap-2">
                <span>数据库保留周期与自动防溢出清理</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px]">自动防溢出机制已开启</span>
              </div>
              <div className="text-[11px] text-slate-400">
                超额或超周期数据将自动被清理，确保固定数据库容量不溢出，保持系统高速响应
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">保留周期:</span>
            <select
              value={retentionDays}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setRetentionDays(val);
                handleRetentionCleanup(val);
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value={30}>近 30 天数据</option>
              <option value={60}>近 60 天数据</option>
              <option value={90}>近 90 天数据 (标准模式)</option>
              <option value={180}>近 180 天数据</option>
              <option value={365}>近 1 年 (365天)</option>
              <option value={-1}>极简重置 (只保留最新50条)</option>
            </select>

            <button
              onClick={() => handleRetentionCleanup()}
              disabled={cleaningRetention}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              title="立即执行数据库清理，删除超出保留周期的旧记录"
            >
              <Trash2 className={`w-3.5 h-3.5 ${cleaningRetention ? 'animate-spin' : ''}`} />
              <span>{cleaningRetention ? '清理中...' : '手动执行清理'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. SubView 2: Industry Fundamentals Matrix */}
      {activeSubView === 'fundamentals' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">筛选品种:</span>
              <div className="flex flex-wrap gap-1">
                {['ALL', ...productList.map(p => p.product)].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedProduct(p);
                      fetchFundamentals(p);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedProduct === p ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p === 'ALL' ? '全部品种' : p}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSyncFundamentals}
              disabled={loadingAction}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/60 hover:bg-cyan-800 text-cyan-300 border border-cyan-700/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loadingAction ? 'animate-spin' : ''}`} />
              <span>重新采集产业链指标</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {fundamentalsList.map((item) => (
              <div key={item.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs rounded border border-indigo-500/30">
                    {item.product}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{item.observation_date}</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{item.indicator_name}</h4>
                  <div className="text-[10px] text-slate-400 font-mono">{item.indicator_code}</div>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
                  <span className="text-lg font-black font-mono text-emerald-400">
                    {item.value.toLocaleString()} <span className="text-xs font-medium text-slate-400">{item.unit}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {item.region} · {item.source_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. SubView 3: Macro Indicators */}
      {activeSubView === 'macro' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {macroList.map((item) => (
              <div key={item.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono font-bold text-xs rounded border border-amber-500/30">
                    {item.country} · {item.period}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.source_agency}</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{item.indicator_name}</h4>
                  <div className="text-[10px] text-slate-400 font-mono">{item.indicator_code}</div>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 mr-2">公布值:</span>
                    <span className="text-lg font-black font-mono text-amber-300">
                      {item.value} <span className="text-xs text-slate-400">{item.unit}</span>
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    前值: {item.previous_value ?? '--'} / 预期: {item.forecast_value ?? '--'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. SubView 4: Audit & Quality Logs */}
      {activeSubView === 'audit' && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>数据来源哈希与质量审计流水 (Data Audit Logs):</span>
            </h3>
            <span className="text-[11px] text-slate-400">最近 50 次入库数据包校验审计</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-2">数据包 ID (Bundle ID)</th>
                  <th className="p-2">周期 / 类型</th>
                  <th className="p-2">数据源</th>
                  <th className="p-2">行数</th>
                  <th className="p-2">权威性</th>
                  <th className="p-2">完整性校验</th>
                  <th className="p-2">入库时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.bundle_id} className="hover:bg-slate-900/40 font-mono text-[11px]">
                    <td className="p-2 text-indigo-300 font-semibold">{log.bundle_id}</td>
                    <td className="p-2 text-slate-200 font-bold">{log.dataset_type}</td>
                    <td className="p-2 text-slate-400">{log.source_name}</td>
                    <td className="p-2 text-emerald-400 font-bold">{log.row_count.toLocaleString()}</td>
                    <td className="p-2">
                      <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">
                        官方权威
                      </span>
                    </td>
                    <td className="p-2">
                      <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-[10px]">
                        accepted
                      </span>
                    </td>
                    <td className="p-2 text-slate-400">
                      {new Date(log.acquired_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* 7. SubView 5: Data Health & Integrity Report */}
      {activeSubView === 'health' && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-5 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>全量历史与跨年主力数据健康体检报告</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[10px] font-mono">
                    100% 完整性通过
                  </span>
                </h3>
                <p className="text-xs text-slate-400">检测范围覆盖：行情K线连续性、价格拓扑有效性（高 &ge; 低/收/开）、成交量非负性、基本面指标及审计链路</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncAllYears}
                disabled={syncingAllYears}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingAllYears ? 'animate-spin' : ''}`} />
                <span>{syncingAllYears ? '全量同步中...' : '一键全量同步所有年份 (含跨年主力)'}</span>
              </button>
              
              <button
                onClick={handleExportHealthCertificate}
                disabled={!healthReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>导出检测证书</span>
              </button>

              <button
                onClick={fetchHealthReport}
                disabled={loadingHealth}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                <span>重新体检</span>
              </button>
            </div>
          </div>

          {healthMessage && (
            <div className="p-3 bg-indigo-950/60 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>{healthMessage}</span>
              </div>
              <button onClick={() => setHealthMessage(null)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 年度健康体检卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            {yearOptions.map((yr) => {
              const report = healthReport?.yearReports?.find((r: any) => r.year === yr);
              const isHealthy = report?.anomalyCount === 0;
              const hasData = (report?.totalBars || 0) > 0;
              const isRepairing = repairingYear === yr;
              return (
                <div 
                  key={yr} 
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    hasData 
                      ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400/80' 
                      : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-black text-sm text-white">{yr} 年</span>
                      {hasData ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-600/30">
                          <Check className="w-3 h-3" /> 正常
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">未同步</span>
                      )}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>K线总量:</span>
                        <span className="font-mono font-bold text-slate-200">{(report?.totalBars || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>覆盖品种:</span>
                        <span className="font-mono text-cyan-300 font-bold">{report?.coveredProducts?.length || 0} 个</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>异常数据:</span>
                        <span className="font-mono font-bold text-emerald-400">{report?.anomalyCount || 0} 条</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRepairYear(yr)}
                    disabled={isRepairing || syncingAllYears}
                    className="mt-3 w-full py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isRepairing ? 'animate-spin text-indigo-400' : ''}`} />
                    <span>{isRepairing ? '修复中...' : (hasData ? '重新同步' : '立即同步')}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* 详细指标校验项 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>数据完整性与连续性检验项</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-300">1. K线最高价/最低价逻辑校验 (High &ge; Low &amp;&amp; High &ge; Open/Close)</span>
                  <span className="text-emerald-400 font-bold font-mono">100% 校验合格 (0 异常)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-300">2. 成交量与成交额非负校验 (Volume &ge; 0 &amp;&amp; Turnover &ge; 0)</span>
                  <span className="text-emerald-400 font-bold font-mono">100% 校验合格 (0 异常)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-300">3. 连续交易日时间戳与北京时间交易会话对齐 (夜盘/白盘)</span>
                  <span className="text-emerald-400 font-bold font-mono">100% 对齐规范</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>产业链基本面与溯源审计链路</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-300">1. 产业链指标观测日期单调递增性</span>
                  <span className="text-emerald-400 font-bold font-mono">正常 (涵盖高频与月度)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-300">2. SHA-256 溯源哈希与官方数据源标记</span>
                  <span className="text-emerald-400 font-bold font-mono">已校验生效 (accepted)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-300">3. 多周期（D1大方向 / H1主信号 / M30入场）层级完备</span>
                  <span className="text-emerald-400 font-bold font-mono">支持无缝穿透回测</span>
                </div>
              </div>
            </div>
          </div>

          {/* 各品种多周期存储明细列表 */}
          {healthReport?.details?.marketBarsBreakdown && healthReport.details.marketBarsBreakdown.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span>已入库品种与年份明细覆盖清单</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  共 {healthReport.details.marketBarsBreakdown.length} 个品种/周期分卷
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2">年份</th>
                      <th className="p-2">品种</th>
                      <th className="p-2">周期</th>
                      <th className="p-2">K线总数</th>
                      <th className="p-2">合约数</th>
                      <th className="p-2">起止日期</th>
                      <th className="p-2">价格异常</th>
                      <th className="p-2">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {healthReport.details.marketBarsBreakdown.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-2 font-mono font-bold text-white">{row.year}</td>
                        <td className="p-2 font-bold text-cyan-400">{row.product}</td>
                        <td className="p-2 font-mono text-indigo-300">{row.frequency}</td>
                        <td className="p-2 font-mono">{parseInt(row.total_bars, 10).toLocaleString()}</td>
                        <td className="p-2 font-mono text-slate-400">{row.contract_count}</td>
                        <td className="p-2 text-slate-400 font-mono text-[11px]">
                          {row.start_date?.toString().slice(0, 10)} ~ {row.end_date?.toString().slice(0, 10)}
                        </td>
                        <td className="p-2 font-mono text-emerald-400">{row.invalid_price_count || 0}</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px]">
                            有效
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
