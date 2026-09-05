# PostgreSQL Backup and Restore Runbook

## Objectives

- RPO: at most 24 hours after daily scheduling is installed.
- Retention: 7 daily backups and 4 weekly backups.
- Verification: every backup must pass `pg_restore --list`.
- Recovery proof: restore into an isolated database and compare critical table row counts.

## Docker Compose Deployment

Preview commands without touching PostgreSQL:

```bash
bash scripts/backup_db.sh --dry-run
bash scripts/restore_drill.sh --dry-run
```

Create and verify a real backup using the PostgreSQL client inside the running container:

```bash
BACKUP_MODE=compose bash scripts/backup_db.sh
bash scripts/restore_drill.sh
```

The backup status is written to `data/ops/backup_status.json`. The latest restore drill report is written to `data/ops/restore_drill_report.json`.

## Scheduling

Install the daily 03:00 cron entry after reviewing it:

```bash
bash scripts/backup_db.sh --install-cron --dry-run
bash scripts/backup_db.sh --install-cron
```

Cron logs are appended to `logs/backup.log`.

## Off-Device Copy

Set exactly one optional destination:

```bash
BACKUP_RCLONE_TARGET=remote:trading-strategy-center BACKUP_MODE=compose bash scripts/backup_db.sh
BACKUP_RSYNC_TARGET=user@backup-host:/srv/tsc/ BACKUP_MODE=compose bash scripts/backup_db.sh
```

Local backups alone do not protect against disk or device loss.

## Host PostgreSQL Client Mode

For non-Compose deployments, set `BACKUP_MODE=host` plus `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_NAME`. The installed `pg_dump` major version must be equal to or newer than the PostgreSQL server major version.

## Data Retention

Minute bars older than 180 days may be removed by the existing sync scheduler. A successful backup and off-device copy are required before relying on that retention policy.
