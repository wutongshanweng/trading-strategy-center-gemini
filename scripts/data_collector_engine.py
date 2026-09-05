"""
期货数据标准接口 v1.0
========================================
- 标准化数据库字段 (OHLCV + 持仓 + 结算价)
- 多品种支持，默认5个核心品种
- 数据质量校验 + 速度 + 文件大小统计
- 可移植到任何量化交易系统
========================================
"""
import sys, time, os, json, math
sys.stdout.reconfigure(encoding='utf-8')

import akshare as ak
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Tuple, Callable
from dataclasses import dataclass, asdict, field
from pathlib import Path

# ============================================================
#  标准数据库字段定义
# ============================================================

# 日线表字段
DAILY_COLUMNS = ['symbol', 'date', 'open', 'high', 'low', 'close',
                 'volume', 'hold', 'settle']

# 分钟线表字段
MINUTE_COLUMNS = ['symbol', 'datetime', 'open', 'high', 'low', 'close', 'volume']

# ============================================================
#  品种注册表 (核心配置)
#  新增品种只需在此表添加一行
# ============================================================

VARIED_MAP = {
    '甲醇':   {'symbol_code': 'MA', 'exchange': 'czce', 'description': ' Methanol 甲醇'},
    '玻璃':   {'symbol_code': 'FG', 'exchange': 'czce', 'description': 'Glass 玻璃'},
    '纯碱':   {'symbol_code': 'SA', 'exchange': 'czce', 'description': 'Soda Ash 纯碱'},
    '豆粕':   {'symbol_code': 'M',  'exchange': 'dce',  'description': 'Soybean Meal 豆粕'},
    '螺纹钢': {'symbol_code': 'RB', 'exchange': 'shfe', 'description': 'Rebar 螺纹钢'},
}

# ============================================================
#  采集配置
# ============================================================

@dataclass
class CollectionConfig:
    start_date: str = '2019-01-01'
    end_date: str = '2026-08-31'
    storage_dir: str = 'data/historical'
    file_format: str = 'csv'          # csv / parquet
    speed_limit: float = 0.05         # 秒/请求，防限流
    max_retries: int = 3              # 失败重试次数
    quality_threshold: float = 0.95   # 质量阈值(可接受比例)


# ============================================================
#  质量检查器
# ============================================================

@dataclass
class QualityCheck:
    symbol: str
    period: str              # D1 / M30 / H1
    total_rows: int = 0
    null_count: int = 0
    price_errors: int = 0    # high<low 或 close越界
    date_gaps: int = 0       # 日期间隙>3天
    time_consistency: float = 1.0  # 时间间隔一致性比例
    date_start: str = ''
    date_end: str = ''
    status: str = 'OK'       # OK / WARN / ERROR
    issues: List[str] = field(default_factory=list)

    def score(self) -> float:
        """质量评分 0~1"""
        if self.total_rows == 0:
            return 0.0
        penalties = 0.0
        if self.null_count > 0:
            penalties += self.null_count / self.total_rows * 0.3
        if self.price_errors > 0:
            penalties += self.price_errors / self.total_rows * 0.3
        if self.date_gaps > 0:
            penalties += min(self.date_gaps * 0.01, 0.2)
        if self.time_consistency < 0.8:
            penalties += (1 - self.time_consistency) * 0.2
        return max(0.0, 1.0 - penalties)


def check_daily(df: pd.DataFrame, symbol: str) -> QualityCheck:
    if df is None or len(df) == 0:
        return QualityCheck(symbol, 'D1', 0, issues=['EMPTY'])
    q = QualityCheck(symbol, 'D1', total_rows=len(df))

    # 空值
    q.null_count = int(df[['open','high','low','close','volume']].isnull().sum().sum())
    
    # 价格逻辑
    bad_hl = int((df['high'] < df['low']).sum())
    bad_co = int(((df['close'] > df['high']) | (df['close'] < df['low'])).sum())
    q.price_errors = bad_hl + bad_co
    
    # 日期间隙
    if 'date' in df.columns:
        dates = pd.to_datetime(df['date'])
        q.date_start = str(dates.iloc[0].date())
        q.date_end = str(dates.iloc[-1].date())
        diffs = dates.diff().dt.days.dropna()
        q.date_gaps = int((diffs > 3).sum())
    elif 'datetime' in df.columns:
        dts = pd.to_datetime(df['datetime'])
        q.date_start = str(dts.iloc[0])
        q.date_end = str(dts.iloc[-1])
        q.time_consistency = _minute_consistency(dts, 1440)
    
    q.status = 'WARN' if (q.null_count > 0 or q.price_errors > 0 or q.date_gaps > 5) else 'OK'
    if q.null_count > 0: q.issues.append(f'nulls={q.null_count}')
    if q.price_errors > 0: q.issues.append(f'price_err={q.price_errors}')
    if q.date_gaps > 5: q.issues.append(f'gaps={q.date_gaps}')
    return q


def check_minute(df: pd.DataFrame, symbol: str, period_min: int) -> QualityCheck:
    if df is None or len(df) == 0:
        return QualityCheck(symbol, f'M{period_min}', 0, issues=['EMPTY'])
    q = QualityCheck(symbol, f'M{period_min}', total_rows=len(df))

    q.null_count = int(df[['open','high','low','close','volume']].isnull().sum().sum())
    bad_hl = int((df['high'] < df['low']).sum())
    bad_co = int(((df['close'] > df['high']) | (df['close'] < df['low'])).sum())
    q.price_errors = bad_hl + bad_co
    
    if 'datetime' in df.columns:
        dts = pd.to_datetime(df['datetime'])
        q.date_start = str(dts.iloc[0])
        q.date_end = str(dts.iloc[-1])
        q.time_consistency = _minute_consistency(dts, period_min)
    
    q.status = 'WARN' if q.price_errors > 0 or q.null_count > 0 else 'OK'
    if q.price_errors > 0: q.issues.append(f'price_err={q.price_errors}')
    return q


def _minute_consistency(dts: pd.Series, period_min: int) -> float:
    diffs = dts.diff().dropna()
    expected = pd.Timedelta(minutes=period_min)
    if len(diffs.mode()) > 0:
        mode_val = diffs.mode()[0]
        consistent = (diffs == mode_val).sum()
    else:
        consistent = (diffs == expected).sum()
    return float(consistent) / len(diffs) if len(diffs) > 0 else 0.0


# ============================================================
#  数据源层
# ============================================================

class DataSource:
    """数据源基类"""
    name = 'base'
    status = 'UNAVAILABLE'

    def fetch_daily(self, symbol: str) -> Optional[pd.DataFrame]:
        raise NotImplementedError
    
    def fetch_minute(self, symbol: str, period: str) -> Optional[pd.DataFrame]:
        raise NotImplementedError


class SinaDataSource(DataSource):
    """新浪财经 - 主源 (免费，稳定)"""
    name = 'sina'
    status = 'OK'

    def fetch_daily(self, symbol: str) -> Optional[pd.DataFrame]:
        """symbol 格式: 'rb2701', 'ma2501' (小写)"""
        for _ in range(3):
            try:
                df = ak.futures_zh_daily_sina(symbol=symbol.lower())
                if df is not None and len(df) > 0:
                    df['symbol'] = symbol.upper()
                    return df
                return pd.DataFrame()
            except Exception as e:
                time.sleep(0.5)
        return None
    
    def fetch_minute(self, symbol: str, period: str) -> Optional[pd.DataFrame]:
        """period: '30' or '60'"""
        for _ in range(3):
            try:
                df = ak.futures_zh_minute_sina(symbol=symbol.lower(), period=period)
                if df is not None and len(df) > 0:
                    df['symbol'] = symbol.upper()
                    return df
                return pd.DataFrame()
            except Exception as e:
                time.sleep(0.5)
        return None


class EastMoneyDataSource(DataSource):
    """东方财富 - 备源 (当前网络不可用，保留接口)"""
    name = 'eastmoney'
    status = 'UNAVAILABLE'

    def fetch_daily(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            var_name = _sym_to_var_name(symbol)
            df = ak.futures_hist_em(symbol=var_name,
                                    start_date='20190101', end_date='20260831')
            if df is not None and len(df) > 0:
                df['symbol'] = symbol.upper()
                return df
        except:
            pass
        return None
    
    def fetch_minute(self, symbol: str, period: str) -> Optional[pd.DataFrame]:
        return None


def _sym_to_var_name(symbol: str) -> str:
    """合约代码转品种中文名"""
    code = symbol[:2].upper()
    for name, info in VARIED_MAP.items():
        if info['symbol_code'] == code:
            return name
    return symbol


# ============================================================
#  标准字段转换器
# ============================================================

def normalize_daily(df: pd.DataFrame) -> pd.DataFrame:
    """将 Sina 原始列映射到标准字段"""
    col_map = {
        'date': 'date',
        'open': 'open', 'high': 'high', 'low': 'low', 'close': 'close',
        'volume': 'volume',
    }
    if 'hold' in df.columns:
        col_map['hold'] = 'hold'
    if 'settle' in df.columns:
        col_map['settle'] = 'settle'

    result = df[[c for c in col_map.values() if c in df.columns]].copy()
    if 'symbol' not in result.columns:
        result['symbol'] = df.get('symbol', '')
    result['date'] = pd.to_datetime(result['date']).dt.date
    for col in ['open', 'high', 'low', 'close', 'volume', 'hold', 'settle']:
        if col in result.columns:
            result[col] = pd.to_numeric(result[col], errors='coerce')
    return result[[c for c in DAILY_COLUMNS if c in result.columns]]


def normalize_minute(df: pd.DataFrame) -> pd.DataFrame:
    """将 Sina 分钟线原始列映射到标准字段"""
    result = df[['datetime', 'open', 'high', 'low', 'close', 'volume']].copy()
    result['symbol'] = df.get('symbol', '')
    result['datetime'] = pd.to_datetime(result['datetime'])
    for col in ['open', 'high', 'low', 'close', 'volume']:
        if col in result.columns:
            result[col] = pd.to_numeric(result[col], errors='coerce')
    return result[[c for c in MINUTE_COLUMNS if c in result.columns]]


# ============================================================
#  主采集引擎
# ============================================================

@dataclass
class ContractInfo:
    symbol: str          # 合约号如 MA2501
    full_symbol: str     # 完整代码如 MA2501
    variety: str         # 品种名 如 甲醇
    var_code: str        # 品种代码 MA
    exchange: str        # 交易所 czce/shfe/dce
    start_date: str      # 实际上市日
    end_date: str        # 最后交易日
    rows: int = 0
    status: str = 'PENDING'


class FuturesDataCollector:
    """期货数据采集引擎 - 可移植到任何量化系统"""

    def __init__(self, config: CollectionConfig = None, varieties: List[str] = None):
        self.config = config or CollectionConfig()
        self.variety_list = varieties or list(VARIED_MAP.keys())
        self.sources = {
            'sina': SinaDataSource(),
            'eastmoney': EastMoneyDataSource(),
        }
        self.results = {}
        self.quality_reports = {}
        self.stats = {
            'start_time': None,
            'end_time': None,
            'total_contracts': 0,
            'collected_contracts': 0,
            'total_rows': {'daily': 0, 'minute_1': 0, 'minute_5': 0, 'minute_30': 0, 'minute_60': 0},
            'total_size_bytes': {'daily': 0, 'minute': 0},
            'speed': {'contracts_per_sec': 0, 'rows_per_sec': 0},
            'errors': [],
        }
        for sub in ['daily', 'minute_1', 'minute_5', 'minute_30', 'minute_60']:
            os.makedirs(f'{self.config.storage_dir}/{sub}', exist_ok=True)
    
    def discover_contracts(self) -> List[ContractInfo]:
        """扫描 2019-至今 所有可用合约"""
        print(f"\n{'='*60}")
        print(f"  扫描合约: {self.variety_list}")
        print(f"  时间范围: {self.config.start_date} ~ {self.config.end_date}")
        print(f"{'='*60}")
    
        contracts = []
        source = self.sources['sina']
        t0 = time.time()
    
        for var_name in self.variety_list:
            info = VARIED_MAP[var_name]
            var_code = info['symbol_code']
            exchange = info['exchange']
            print(f"\n  [{var_name}] {var_code}@{exchange}")
    
            suffixes = []
            for year in range(2019, 2028):
                for month in range(1, 13):
                    suffixes.append(f'{year%100:02d}{month:02d}')
    
            for suffix in suffixes:
                symbol = var_code + suffix
                try:
                    df = source.fetch_daily(symbol)
                    if df is not None and len(df) > 0:
                        df['date'] = pd.to_datetime(df['date'])
                        mask = ((df['date'] >= self.config.start_date) &
                                (df['date'] <= self.config.end_date))
                        if mask.sum() > 0:
                            contract = ContractInfo(
                                symbol=symbol,
                                full_symbol=f'{var_name}{symbol}',
                                variety=var_name,
                                var_code=var_code,
                                exchange=exchange,
                                start_date=str(df['date'].iloc[0].date()),
                                end_date=str(df['date'].iloc[-1].date()),
                            )
                            contracts.append(contract)
                            print(f"    {symbol}: {contract.start_date} ~ {contract.end_date}")
                except:
                    pass
                time.sleep(self.config.speed_limit)
    
        elapsed = time.time() - t0
        print(f"\n  扫描完成: {len(contracts)} 个合约, 耗时 {elapsed:.1f}s")
        return contracts
    
    def collect(self, contracts: List[ContractInfo] = None) -> Dict:
        """执行采集"""
        if contracts is None:
            contracts = self.discover_contracts()
    
        self.stats['start_time'] = datetime.now().isoformat()
        self.stats['total_contracts'] = len(contracts)
        t0 = time.time()
    
        for i, contract in enumerate(contracts):
            sym = contract.symbol
            df_daily = self.sources['sina'].fetch_daily(sym)
            if df_daily is not None and len(df_daily) > 0:
                df_daily = normalize_daily(df_daily)
                path = f"{self.config.storage_dir}/daily/{sym}.csv"
                df_daily.to_csv(path, index=False, encoding='utf-8-sig')
                self.stats['total_rows']['daily'] += len(df_daily)
                contract.rows += len(df_daily)
                contract.status = 'OK'
            time.sleep(self.config.speed_limit)
        return self.stats

def main():
    config = CollectionConfig()
    collector = FuturesDataCollector(config)
    print("Futures Data Collector Initialized")

if __name__ == '__main__':
    main()
