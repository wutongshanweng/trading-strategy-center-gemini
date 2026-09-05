# Authoritative Macro Release Calendar Import

Use this importer to replace estimated macro observation availability with official release timestamps. It only updates existing `macro_data` observations; it never invents observations or release times.

## Document Format

```json
{
  "source": "National Bureau of Statistics release calendar",
  "source_url": "https://www.example.gov/release-calendar",
  "retrieved_at": "2026-08-13T08:00:00Z",
  "releases": [
    {
      "code": "CPI",
      "observation_period": "2026-07-01",
      "available_time": "2026-08-09T01:30:00Z"
    }
  ]
}
```

All timestamps must include a timezone. `source_url` must be an absolute HTTPS URL, and an official `available_time` cannot be later than `retrieved_at`.

## Validate Without Writing

```bash
python scripts/import_macro_release_calendar.py calendar.json
```

Dry-run is the default. It validates provenance, timestamps, duplicates, and the document SHA-256 without connecting to PostgreSQL.

## Apply

```bash
python scripts/import_macro_release_calendar.py calendar.json --apply
```

Apply updates matching rows by macro product code and observation-period date in one transaction. Updated rows set `available_time_estimated=false` and store the source name, URL, retrieval timestamp, and document SHA-256. A reported `written` count is the number of validated update statements, not proof that every observation existed; verify target coverage with a database query after import.
