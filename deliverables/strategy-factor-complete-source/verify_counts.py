"""Verify exported strategy, factor, and feature registry counts."""

from __future__ import annotations

from collections import Counter


def _factor_family(name: str) -> str:
    if name.startswith("gtja_alpha"):
        return "gtja_alpha"
    if name.startswith("alpha_en_"):
        return "alpha_en"
    if name.startswith("alpha"):
        return "alpha"
    return "other"


def main() -> None:
    import signals.strategies  # noqa: F401
    from core.alpha.alpha101.factor_registry import FactorRegistry
    from core.features.feature_store import get_feature_store
    from signals.registry import list_strategies

    strategies = list_strategies()
    FactorRegistry.ensure_initialized()
    factors = FactorRegistry.list_all()
    families = Counter(_factor_family(name) for name in factors)

    print(f"strategy_count={len(strategies)}")
    print(f"chan_strategy_present={'chan_bsp' in strategies}")
    print(f"factor_count={len(factors)}")
    print(f"factor_families={dict(families)}")
    print(f"feature_metadata_count={get_feature_store().stats()['total_features']}")

    if len(strategies) != 90:
        raise SystemExit("unexpected strategy count")
    if "chan_bsp" not in strategies:
        raise SystemExit("chan_bsp is missing")
    if len(factors) != 483:
        raise SystemExit("unexpected factor count")


if __name__ == "__main__":
    main()
