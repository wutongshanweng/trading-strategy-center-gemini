# Instrument Specification Import

Trusted backtests fail closed when an active instrument specification is missing. Do not
invent multipliers, margins, or commissions and do not use the embedded knowledge base as
an authoritative production source.

Prepare a UTF-8 JSON document from an exchange, broker settlement notice, or another
approved authoritative source. Every document must include provenance and effective time:

```json
{
  "source": "Approved broker specification notice",
  "source_url": "https://example.com/official-notice",
  "retrieved_at": "2026-08-13T08:00:00+08:00",
  "records": [
    {
      "symbol": "RB",
      "asset_type": "future",
      "exchange": "SHFE",
      "contract_multiplier": 10,
      "tick_size": 1,
      "lot_size": 1,
      "initial_margin_rate": 0.12,
      "maintenance_margin_rate": 0.10,
      "commission_type": "ratio",
      "commission_rate": 0.0001,
      "commission_fixed": 0,
      "effective_from": "2026-08-13T00:00:00+08:00"
    }
  ]
}
```

Validate without writing:

```bash
python scripts/import_instrument_specs.py specs.json
```

Apply only after reviewing the source and printed SHA-256 fingerprint:

```bash
python scripts/import_instrument_specs.py specs.json --apply
```

Each imported row stores source name, URL, retrieval time, and document SHA-256 in
`metadata_json`. A newer effective version closes the previous active version. The loader
continues to reject missing specifications rather than falling back to guessed values.
