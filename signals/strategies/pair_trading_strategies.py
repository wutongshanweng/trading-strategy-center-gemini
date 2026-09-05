"""配对交易策略 — 基于协整关系的价差均值回归。

使用 statsmodels 做 OLS + ADF 检验，z-score 入场/出场。
与 cross_symbol/pair_trading.py 的 PairTrader 配合使用。
"""

from typing import Optional

import numpy as np
import pandas as pd

from signals.base import BaseStrategy, Signal, Direction
from signals.registry import register
from cross_symbol.pair_trading import PairTrader


@register
class PairTradingZScore(BaseStrategy):
    """配对交易 — 协整价差 z-score 均值回归。

    需要 params 中配置 pair_symbol (配对标的代码)。
    通过 DataStore 获取配对标的的日线数据。
    """

    name = "pair_trading_zscore"
    description = "协整配对交易 — z-score 均值回归 (需配置 pair_symbol)"
    timeframes = ["1d"]
    params = {
        "pair_symbol": "",       # 配对标的代码 (必填)
        "entry_z": 2.0,          # z-score 入场阈值
        "exit_z": 0.5,           # z-score 出场阈值
        "lookback": 252,         # 协整计算回看天数
    }

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._trader: Optional[PairTrader] = None
        self._last_zscore: float = 0.0
        self._position: int = 0

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Signal | None:
        pair_sym = self.params.get("pair_symbol", "")
        if not pair_sym:
            return None

        pair_df = self._get_pair_data(pair_sym, df)
        if pair_df is None or len(pair_df) < 50:
            return None

        if self._trader is None:
            self._trader = PairTrader(symbol, pair_sym)

        result = self._trader.compute_cointegration(df, pair_df)
        if np.isnan(result.get("pvalue", np.nan)) or result["pvalue"] > 0.10:
            return None

        signals = self._trader.generate_signals(df, pair_df, entry_z=self.params["entry_z"])
        if not signals:
            return None

        latest = signals[-1]
        self._last_zscore = latest.zscore
        price = float(df["close"].iloc[-1])
        abs_z = abs(latest.zscore)
        confidence = min((abs_z - self.params["entry_z"]) / self.params["entry_z"] + 0.3, 1.0)

        if latest.action == "long":
            self._position = 1
            return Signal(
                symbol=symbol, direction=Direction.BUY, confidence=confidence,
                price=price,
                reason=f"价差均值回归 z={latest.zscore:.2f} 做多{symbol}/做空{pair_sym}",
                strategy_name=self.name, timeframe=self.timeframes[0],
                stop_loss=float(price * 0.95), take_profit=float(price * 1.05),
            )
        elif latest.action == "short":
            self._position = -1
            return Signal(
                symbol=symbol, direction=Direction.SELL, confidence=confidence,
                price=price,
                reason=f"价差均值回归 z={latest.zscore:.2f} 做空{symbol}/做多{pair_sym}",
                strategy_name=self.name, timeframe=self.timeframes[0],
                stop_loss=float(price * 1.05), take_profit=float(price * 0.95),
            )
        return None

    def _get_pair_data(self, pair_sym: str, ref_df: pd.DataFrame) -> Optional[pd.DataFrame]:
        """获取配对标的的日线数据。通过 DataStore 查询。"""
        try:
            from data_center.storage.postgres_store import get_store
            store = get_store()
            start = ref_df.index[0].strftime("%Y-%m-%d") if hasattr(ref_df.index[0], 'strftime') else str(ref_df.index[0])[:10]
            end = ref_df.index[-1].strftime("%Y-%m-%d") if hasattr(ref_df.index[-1], 'strftime') else str(ref_df.index[-1])[:10]
            sql = "SELECT datetime, open, high, low, close, volume FROM kline WHERE symbol_id=(SELECT symbol_id FROM symbols WHERE code=?) AND timeframe='D1' AND datetime BETWEEN ? AND ? ORDER BY datetime"
            df = store.query(sql, (pair_sym, start, end))
            if df is None or df.empty:
                return None
            df["datetime"] = pd.to_datetime(df["datetime"])
            return df.set_index("datetime")
        except Exception:
            return None
