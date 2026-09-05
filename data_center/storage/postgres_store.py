"""
PostgreSQL 统一数据仓库 — 行情数据存储层。

替换 DuckDB，统一使用 PostgreSQL：
- 单写连接 (threading.Lock 串行化写操作)
- 读操作使用连接池 (ThreadedConnectionPool)
- products/symbols 两层结构, kline 统一多周期表
- PRIMARY KEY 天然去重
"""

from __future__ import annotations

import os
import re
import numpy as np
import threading
from typing import Optional

import pandas as pd
import psycopg2
import psycopg2.extras
from psycopg2.pool import ThreadedConnectionPool
from loguru import logger
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(usecwd=True))

_DB_HOST = os.getenv("DB_HOST", "localhost")
_DB_PORT = int(os.getenv("DB_PORT", "5432"))
_DB_USER = os.getenv("DB_USER", "trading")
_DB_PASSWORD = os.getenv("DB_PASS", "trading_pass")
_DB_NAME = os.getenv("DB_NAME", "trading_strategy_center")
_POOL_MIN = int(os.getenv("DB_POOL_MIN", "2"))
_POOL_MAX = int(os.getenv("DB_POOL_MAX", "8"))


def _clean_val(v):
    """将 numpy/pandas 类型转为 psycopg2 可序列化的 Python 原生类型。"""
    if isinstance(v, (np.integer, np.floating)):
        if np.isnan(v) or np.isinf(v):
            return None
        return float(v) if isinstance(v, np.floating) else int(v)
    if isinstance(v, (list, tuple)):
        return list(v)
    if pd.isna(v):
        return None
    return v


def _validated_schema(schema: str | None) -> str | None:
    if schema is None:
        return None
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", schema):
        raise ValueError("Invalid PostgreSQL schema name")
    return schema


def _conn_str(schema: str | None = None) -> str:
    dsn = f"host={_DB_HOST} port={_DB_PORT} user={_DB_USER} password={_DB_PASSWORD} dbname={_DB_NAME}"
    return f"{dsn} options='-c search_path={schema}'" if schema else dsn


def _create_conn(schema: str | None = None) -> psycopg2.extensions.connection:
    return psycopg2.connect(
        host=_DB_HOST, port=_DB_PORT,
        user=_DB_USER, password=_DB_PASSWORD,
        dbname=_DB_NAME,
        options=f"-c search_path={schema}" if schema else None,
    )


class PostgresStore:
    """行情数据仓库 — 单写多读。"""

    def __init__(self, schema: str | None = None):
        schema = _validated_schema(schema)
        self.schema = schema or "public"
        self._write_lock = threading.Lock()
        self._write_conn = _create_conn(schema)
        self._pool = ThreadedConnectionPool(_POOL_MIN, _POOL_MAX, dsn=_conn_str(schema))
        logger.info(f"PostgreSQL store initialized (pool {_POOL_MIN}-{_POOL_MAX})")

    # ---- 通用写 ------------------------------------------------------------

    def execute(self, sql: str, params: Optional[tuple] = None) -> None:
        sql = sql.replace("?", "%s")
        clean_params = [_clean_val(p) for p in (params or ())]
        with self._write_lock:
            try:
                with self._write_conn.cursor() as cur:
                    cur.execute(sql, clean_params)
                self._write_conn.commit()
            except Exception:
                self._write_conn.rollback()
                raise

    def upsert_df(self, table: str, df: pd.DataFrame, key_cols: list[str]) -> int:
        if df is None or df.empty:
            return 0
        if df.shape[0] == 0:
            return 0
        cols = list(df.columns)
        col_list = ", ".join(cols)
        template = "(" + ", ".join(["%s"] * len(cols)) + ")"
        sql = f"INSERT INTO {table} ({col_list}) VALUES %s ON CONFLICT DO NOTHING"
        values = [[_clean_val(v) for v in row] for _, row in df.iterrows()]
        with self._write_lock:
            try:
                with self._write_conn.cursor() as cur:
                    psycopg2.extras.execute_values(
                        cur, sql, values, template=template, page_size=1000,
                    )
                self._write_conn.commit()
            except Exception:
                self._write_conn.rollback()
                raise
        return len(df)

    def upsert_df_on_conflict(self, table: str, df: pd.DataFrame, key_cols: list[str]) -> int:
        if df is None or df.empty:
            return 0
        if df.shape[0] == 0:
            return 0
        cols = list(df.columns)
        col_list = ", ".join(cols)
        update_cols = [c for c in cols if c not in key_cols]
        set_clause = ", ".join([f"{c}=EXCLUDED.{c}" for c in update_cols])
        if not set_clause:
            return self.upsert_df(table, df, key_cols)
        template = f"({', '.join(['%s'] * len(cols))})"
        sql = (
            f"INSERT INTO {table} ({col_list}) VALUES %s "
            f"ON CONFLICT ({','.join(key_cols)}) DO UPDATE SET {set_clause}"
        )
        vals = [[_clean_val(row[c]) for c in cols] for _, row in df.iterrows()]
        with self._write_lock:
            try:
                with self._write_conn.cursor() as cur:
                    psycopg2.extras.execute_values(cur, sql, vals, template=template, page_size=1000)
                self._write_conn.commit()
            except Exception:
                self._write_conn.rollback()
                raise
        return len(df)

    # ---- 查询 --------------------------------------------------------------

    def query(self, sql: str, params: Optional[tuple] = None) -> pd.DataFrame:
        sql = sql.replace("?", "%s")
        conn = self._pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
                colnames = [desc[0] for desc in cur.description]
                rows = cur.fetchall()
                return pd.DataFrame(rows, columns=colnames)
        finally:
            self._pool.putconn(conn)

    def query_one(self, sql: str, params: Optional[tuple] = None) -> Optional[dict]:
        rows = self.query(sql, params)
        return rows.iloc[0].to_dict() if not rows.empty else None

    def close(self) -> None:
        with self._write_lock:
            self._write_conn.close()
        self._pool.closeall()


_store: Optional[PostgresStore] = None
_store_lock = threading.Lock()


def get_store() -> PostgresStore:
    global _store
    if _store is None:
        with _store_lock:
            if _store is None:
                _store = PostgresStore()
    return _store


def reset_store() -> None:
    global _store
    with _store_lock:
        if _store is not None:
            try:
                _store.close()
            except Exception:
                pass
        _store = None
