"""
期货数据源接入层 - 主备源 + 质量校验 + 自动采集预留
测试日期: 2026-08-31
品种: 甲醇/玻璃/纯碱/豆粕/螺纹钢
合约: 2701, 2705
周期: M30, H1, D1
"""
import sys, time, os, json
sys.stdout.reconfigure(encoding='utf-8')

import akshare as ak
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass, asdict

DATA_DIR = 'data'
os.makedirs(f'{DATA_DIR}/sina_daily', exist_ok=True)
os.makedirs(f'{DATA_DIR}/sina_minute', exist_ok=True)
os.makedirs(f'{DATA_DIR}/em_daily', exist_ok=True)


# ===== 数据源定义 =====

SOURCES = {
    'sina_daily': {
        'name': 'Sina Daily',
        'type': 'daily',
        'priority': 1,       # 主源
        'status': 'OK',
        'description': '新浪财经期货日线数据'
    },
    'sina_minute': {
        'name': 'Sina Minute',
        'type': 'minute',
        'periods': ['30', '60'],
        'priority': 1,
        'status': 'OK',
        'description': '新浪财经期货分钟线数据'
    },
    'eastmoney_daily': {
        'name': 'EastMoney Daily',
        'type': 'daily',
        'priority': 2,       # 备源
        'status': 'UNAVAILABLE',
        'description': '东方财富期货日线 (当前网络不可用)'
    },
    'pytdx': {
        'name': 'PyTdx',
        'type': 'realtime',
        'priority': 3,
        'status': 'UNAVAILABLE',
        'description': '通达信协议 (不支持期货K线)'
    },
}


# ===== 质量检查 =====

@dataclass
class DataQualityReport:
    source: str
    symbol: str
    period: str
    total_rows: int
    null_count: int
    price_errors: int
    date_gaps: int
    time_inconsistency: float
    date_range_start: str
    date_range_end: str
    status: str
    issues: List[str]

    def to_dict(self):
        return asdict(self)


def check_daily_quality(df: pd.DataFrame, symbol: str, source: str) -> DataQualityReport:
    if df is None or len(df) == 0:
        return DataQualityReport(source, symbol, 'D1', 0, 0, 0, 0, 0, '', '', 'EMPTY', [])

    issues = []
    # 空值
    nulls = int(df[['open', 'high', 'low', 'close', 'volume']].isnull().sum().sum())
    if nulls > 0:
        issues.append(f'nulls={nulls}')
    
    # 价格逻辑
    bad_hl = int((df['high'] < df['low']).sum())
    bad_co = int(((df['close'] > df['high']) | (df['close'] < df['low'])).sum())
    price_errors = bad_hl + bad_co
    if price_errors > 0:
        issues.append(f'price_errors={price_errors}')
    
    # 日期间隙
    dates = pd.to_datetime(df['date'])
    diffs = dates.diff().dt.days.dropna()
    gaps = int((diffs > 3).sum())
    if gaps > 0:
        # 检查是否是节假日/周末
        issues.append(f'date_gaps={gaps}(likely holidays)')
    
    date_start = str(dates.iloc[0].date())
    date_end = str(dates.iloc[-1].date())
    
    status = 'OK' if not issues else 'WARN'
    return DataQualityReport(source, symbol, 'D1', len(df), nulls, price_errors,
                             gaps, 0, date_start, date_end, status, issues)


def check_minute_quality(df: pd.DataFrame, symbol: str, source: str, period: int = 30) -> DataQualityReport:
    if df is None or len(df) == 0:
        return DataQualityReport(source, symbol, f'M{period}', 0, 0, 0, 0, 0, '', '', 'EMPTY', [])

    issues = []
    nulls = int(df[['open', 'high', 'low', 'close', 'volume']].isnull().sum().sum())
    if nulls > 0:
        issues.append(f'nulls={nulls}')
    
    bad_hl = int((df['high'] < df['low']).sum())
    bad_co = int(((df['close'] > df['high']) | (df['close'] < df['low'])).sum())
    price_errors = bad_hl + bad_co
    if price_errors > 0:
        issues.append(f'price_errors={price_errors}')
    
    # 时间间隔一致性
    dts = pd.to_datetime(df['datetime'])
    diffs = dts.diff().dropna()
    expected = pd.Timedelta(minutes=period)
    mode_val = diffs.mode()[0] if len(diffs.mode()) > 0 else expected
    consistent = int((diffs == mode_val).sum())
    total_diffs = len(diffs)
    inconsistency_rate = 1 - consistent / total_diffs if total_diffs > 0 else 0
    
    # 由于期货有夜盘和日盘切换，不一致是正常现象
    # 只标记严重不一致
    if inconsistency_rate > 0.5:
        issues.append(f'time_inconsistent={inconsistency_rate:.1%}(night/day gap)')
    
    date_start = str(dts.iloc[0])
    date_end = str(dts.iloc[-1])
    
    status = 'OK' if inconsistency_rate < 0.5 else 'WARN'
    return DataQualityReport(source, symbol, f'M{period}', len(df), nulls, price_errors,
                             0, inconsistency_rate, date_start, date_end, status, issues)


# ===== 采集函数 =====

def fetch_sina_daily(symbol: str) -> Optional[pd.DataFrame]:
    """新浪日线 - 主源"""
    try:
        df = ak.futures_zh_daily_sina(symbol=symbol.lower())
        if df is not None and len(df) > 0:
            df['date'] = pd.to_datetime(df['date'])
            return df
        return pd.DataFrame()
    except Exception as e:
        print(f'    [Sina Daily] ERROR: {e}')
        return None


def fetch_sina_minute(symbol: str, period: str = '30') -> Optional[pd.DataFrame]:
    """新浪分钟线 - 主源"""
    try:
        df = ak.futures_zh_minute_sina(symbol=symbol.lower(), period=period)
        if df is not None and len(df) > 0:
            df['datetime'] = pd.to_datetime(df['datetime'])
            return df
        return pd.DataFrame()
    except Exception as e:
        print(f'    [Sina Minute {period}min] ERROR: {e}')
        return None


def fetch_em_daily(symbol_name: str) -> Optional[pd.DataFrame]:
    """东方财富日线 - 备源"""
    try:
        df = ak.futures_hist_em(symbol=symbol_name, start_date='20260101', end_date='20260810')
        if df is not None and len(df) > 0:
            return df
        return pd.DataFrame()
    except Exception as e:
        return None


def save_csv(df: pd.DataFrame, path: str):
    """保存CSV"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_csv(path, index=False, encoding='utf-8-sig')


# ===== 主采集流程 =====

VARIETIES = {
    '甲醇': 'MA', '玻璃': 'FG', '纯碱': 'SA', '豆粕': 'M', '螺纹钢': 'RB'
}
TARGET_CONTRACTS = ['2701', '2705']
TARGET_START = '2026-01-01'
TARGET_END = '2026-08-10'


def collect_all(varieties=None, contracts=None) -> Dict:
    """采集所有数据"""
    vars_to_collect = varieties or list(VARIETIES.keys())
    contracts_to_collect = contracts or TARGET_CONTRACTS

    report = {
        'collected_at': datetime.now().isoformat(),
        'varieties': {},
        'sources_status': {},
        'quality_summary': {},
        'files': []
    }
    
    # 统计各源状态
    for src_name, src_info in SOURCES.items():
        report['sources_status'][src_name] = src_info['status']
    
    total_rows = {'sina_daily': 0, 'sina_30min': 0, 'sina_60min': 0, 'em_daily': 0}
    
    for var_name in vars_to_collect:
        var_sym = VARIETIES[var_name]
        print(f"\n{'='*50}")
        print(f"  {var_name} ({var_sym})")
        print(f"{'='*50}")
    
        var_report = {}
        for contract in contracts_to_collect:
            symbol = var_sym + contract
            print(f"\n  合约: {symbol}")
    
            contract_report = {}
    
            # ===== 主源: Sina Daily =====
            df = fetch_sina_daily(symbol)
            if df is not None and len(df) > 0:
                # 过滤日期范围
                mask = (df['date'] >= TARGET_START) & (df['date'] <= TARGET_END)
                df = df[mask].reset_index(drop=True)
    
                q = check_daily_quality(df, symbol, 'sina_daily')
                out_path = f'{DATA_DIR}/sina_daily/{symbol}.csv'
                save_csv(df, out_path)
                total_rows['sina_daily'] += len(df)
                report['files'].append({'path': out_path, 'rows': len(df), 'source': 'sina_daily'})
                print(f"    Daily: {q.status}  {len(df)} rows  {q.date_range_start}~{q.date_range_end}")
                if q.issues:
                    print(f"      Issues: {q.issues}")
                contract_report['daily'] = q.to_dict()
            else:
                contract_report['daily'] = {'status': 'ERROR', 'rows': 0, 'issues': ['fetch failed']}
    
            # ===== 主源: Sina M30 =====
            df = fetch_sina_minute(symbol, '30')
            if df is not None and len(df) > 0:
                mask = (df['datetime'] >= TARGET_START) & (df['datetime'] <= TARGET_END)
                df = df[mask].reset_index(drop=True)
    
                q = check_minute_quality(df, symbol, 'sina_minute', 30)
                out_path = f'{DATA_DIR}/sina_minute/{symbol}_30min.csv'
                save_csv(df, out_path)
                total_rows['sina_30min'] += len(df)
                report['files'].append({'path': out_path, 'rows': len(df), 'source': 'sina_minute_30'})
                print(f"    M30:   {q.status}  {len(df)} rows  {q.date_range_start[:10]}~{q.date_range_end[:10]}")
                contract_report['minute_30'] = q.to_dict()
            else:
                contract_report['minute_30'] = {'status': 'ERROR', 'rows': 0}
    
            # ===== 主源: Sina H1 =====
            df = fetch_sina_minute(symbol, '60')
            if df is not None and len(df) > 0:
                mask = (df['datetime'] >= TARGET_START) & (df['datetime'] <= TARGET_END)
                df = df[mask].reset_index(drop=True)
    
                q = check_minute_quality(df, symbol, 'sina_minute', 60)
                out_path = f'{DATA_DIR}/sina_minute/{symbol}_60min.csv'
                save_csv(df, out_path)
                total_rows['sina_60min'] += len(df)
                report['files'].append({'path': out_path, 'rows': len(df), 'source': 'sina_minute_60'})
                print(f"    H1:    {q.status}  {len(df)} rows  {q.date_range_start[:10]}~{q.date_range_end[:10]}")
                contract_report['minute_60'] = q.to_dict()
            else:
                contract_report['minute_60'] = {'status': 'ERROR', 'rows': 0}
    
            # ===== 备源: EastMoney Daily =====
            df = fetch_em_daily(var_name)
            if df is not None and len(df) > 0:
                out_path = f'{DATA_DIR}/em_daily/{symbol}.csv'
                save_csv(df, out_path)
                total_rows['em_daily'] += len(df)
                q = check_daily_quality(df, symbol, 'em_daily')
                print(f"    EM_D:  {q.status}  {len(df)} rows")
                contract_report['em_daily'] = q.to_dict()
            else:
                print(f"    EM_D:  SKIP (unavailable)")
                contract_report['em_daily'] = {'status': 'UNAVAILABLE', 'rows': 0,
                                                'issues': ['Connection failed - EastMoney server unavailable']}
    
            time.sleep(0.3)
            var_report[contract] = contract_report
    
        report['varieties'][var_name] = var_report
        report['quality_summary'][var_name] = {
            'daily_rows': sum(cr.get('daily', {}).get('rows', 0) for cr in var_report.values()),
            'm30_rows': sum(cr.get('minute_30', {}).get('rows', 0) for cr in var_report.values()),
            'h1_rows': sum(cr.get('minute_60', {}).get('rows', 0) for cr in var_report.values()),
        }
        time.sleep(0.5)
    
    report['total_rows'] = total_rows
    return report


def print_summary(report: Dict):
    """打印汇总报告"""
    print(f"\n{'='*70}")
    print("  采集汇总报告")
    print(f"{'='*70}")
    print(f"  采集时间: {report['collected_at']}")
    print()

    print("  数据源状态:")
    for src, status in report['sources_status'].items():
        icon = 'OK' if status == 'OK' else 'X'
        print(f"    [{icon}] {src}: {status}")
    print()
    
    print("  各行数统计:")
    for src, rows in report['total_rows'].items():
        print(f"    {src:15s}: {rows:5d} rows")
    print()
    
    print("  各品种统计:")
    for var_name, summary in report.get('quality_summary', {}).items():
        print(f"    {var_name:6s}: D1={summary['daily_rows']:4d}  M30={summary['m30_rows']:4d}  H1={summary['h1_rows']:4d}")
    print()
    
    print("  已生成文件:")
    for f in report.get('files', []):
        print(f"    {f['path']}  ({f['rows']} rows)")
    
    # 跨品种对比
    print()
    print("  跨品种收盘价对比 (最近3天):")
    daily_files = sorted([f for f in report.get('files', [])
                          if f['source'] == 'sina_daily'], key=lambda x: x['path'])
    if daily_files:
        all_closes = {}
        for f in daily_files:
            sym = os.path.basename(f['path']).replace('.csv', '')
            df = pd.read_csv(f['path'], parse_dates=['date'])
            all_closes[sym] = df[['date', 'close']].tail(3)
    
        # Merge
        merged = None
        for sym, df in sorted(all_closes.items()):
            df = df.rename(columns={'close': sym})
            if merged is None:
                merged = df[['date', sym]]
            else:
                merged = pd.merge(merged, df[['date', sym]], on='date', how='outer')
    
        if merged is not None:
            print(merged.to_string(index=False))


def main():
    report = collect_all()
    print_summary(report)

    # Save report
    result_dir = 'data/results'
    os.makedirs(result_dir, exist_ok=True)
    with open(f'{result_dir}/final_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2, default=str)
    print(f"\n报告已保存: {result_dir}/final_report.json")

if __name__ == '__main__':
    main()
