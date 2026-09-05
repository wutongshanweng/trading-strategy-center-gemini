"""策略包自动加载器。

导入本包时自动 import 所有策略子模块,触发各模块内的 @register 装饰器,
将策略类注册进 signals.registry。这样 StrategyEngine.load_all() 才能
通过 get_all_strategies() 拿到全部策略。

新增策略文件无需改动此文件:放进本目录即可被自动发现。
"""
from __future__ import annotations

import importlib
import pkgutil
from typing import List

from loguru import logger

# 不参与自动导入的模块名(无策略定义的工具模块可加入此处)
_SKIP = {"__init__"}


def _autoload() -> List[str]:
    """导入本包下所有子模块 (含 user/ 子包), 返回成功加载的模块名列表。"""
    loaded: List[str] = []
    for mod_info in pkgutil.iter_modules(__path__):
        name = mod_info.name
        if name in _SKIP:
            continue
        try:
            importlib.import_module(f"{__name__}.{name}")
            loaded.append(name)
        except Exception as exc:
            logger.error(f"策略模块 {name} 导入失败: {exc}")
    # 扫描 user/ 子包
    try:
        user_mod = importlib.import_module(f"{__name__}.user")
        for mod_info in pkgutil.iter_modules(user_mod.__path__):
            if mod_info.name in _SKIP:
                continue
            try:
                importlib.import_module(f"{__name__}.user.{mod_info.name}")
                loaded.append(f"user.{mod_info.name}")
            except Exception as exc:
                logger.error(f"用户策略 {mod_info.name} 导入失败: {exc}")
    except ModuleNotFoundError:
        pass  # user/ 目录不存在
    return loaded


_LOADED_MODULES = _autoload()
