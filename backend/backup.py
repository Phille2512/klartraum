"""S.1 (Sicherheitsnetz): Automatische Backups der SQLite-Datenbank.

Nutzt die SQLite-Online-Backup-API (sqlite3.Connection.backup) statt
naivem Datei-Kopieren, damit ein Backup auch sicher ist, während die
Anwendung selbst noch (oder schon wieder) auf die Datenbank zugreift.
"""
import datetime as dt
import sqlite3
from pathlib import Path

from paths import DATA_DIR

DB_PATH = DATA_DIR / "dreams.db"
BACKUP_DIR = DATA_DIR / "backups"

DAILY_RETENTION_DAYS = 14
MONTHLY_RETENTION_MONTHS = 6


def _backup_file(dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    src_conn = sqlite3.connect(str(DB_PATH))
    dst_conn = sqlite3.connect(str(dest))
    try:
        src_conn.backup(dst_conn)
    finally:
        dst_conn.close()
        src_conn.close()
    check_conn = sqlite3.connect(str(dest))
    try:
        result = check_conn.execute("PRAGMA integrity_check").fetchone()
        if result[0] != "ok":
            dest.unlink(missing_ok=True)
            raise RuntimeError(f"Backup-Integritätscheck fehlgeschlagen: {result[0]}")
    finally:
        check_conn.close()


def _daily_backup_path(day: dt.date) -> Path:
    return BACKUP_DIR / f"dreams-{day.isoformat()}.db"


def _backup_auth(day: dt.date) -> None:
    auth_src = DATA_DIR / "auth.json"
    if auth_src.exists():
        auth_dest = BACKUP_DIR / f"auth-{day.isoformat()}.json"
        if not auth_dest.exists():
            import shutil
            auth_dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(auth_src, auth_dest)


def create_daily_backup_if_missing() -> bool:
    """Legt höchstens einmal pro Tag ein Backup an. True, wenn neu erzeugt."""
    if not DB_PATH.exists():
        return False  # Neuinstallation: noch keine Datenbank zu sichern
    today = dt.date.today()
    dest = _daily_backup_path(today)
    if dest.exists():
        return False
    _backup_file(dest)
    _backup_auth(today)
    _rotate()
    return True


def create_pre_migration_backup() -> None:
    """Zusätzlicher Snapshot direkt vor einem ALTER TABLE. Zählt nicht zur
    Rotation und wird nie automatisch gelöscht."""
    if not DB_PATH.exists():
        return
    dest = BACKUP_DIR / f"dreams-pre-migration-{dt.date.today().isoformat()}.db"
    if dest.exists():
        return
    _backup_file(dest)


def _parse_date(filename: str) -> dt.date | None:
    stem = filename.removeprefix("dreams-").removesuffix(".db")
    try:
        return dt.date.fromisoformat(stem)
    except ValueError:
        return None


def _months_ago(today: dt.date, months: int) -> dt.date:
    year = today.year
    month = today.month - months
    while month <= 0:
        month += 12
        year -= 1
    return dt.date(year, month, 1)


def _rotate() -> None:
    if not BACKUP_DIR.exists():
        return
    today = dt.date.today()
    daily_cutoff = today - dt.timedelta(days=DAILY_RETENTION_DAYS)
    monthly_cutoff = _months_ago(today, MONTHLY_RETENTION_MONTHS)

    dated_files: list[tuple[dt.date, Path]] = []
    for f in BACKUP_DIR.glob("dreams-*.db"):
        if "pre-migration" in f.name:
            continue  # nie automatisch löschen
        day = _parse_date(f.name)
        if day:
            dated_files.append((day, f))

    # erstes Backup jedes Monats als Langzeit-Anker markieren
    by_month: dict[tuple[int, int], list[tuple[dt.date, Path]]] = {}
    for day, f in dated_files:
        by_month.setdefault((day.year, day.month), []).append((day, f))
    month_anchor = {
        month_key: min(entries, key=lambda e: e[0])[1]
        for month_key, entries in by_month.items()
    }

    for day, f in dated_files:
        is_anchor = month_anchor.get((day.year, day.month)) == f
        keep_daily = day >= daily_cutoff
        keep_monthly = is_anchor and day >= monthly_cutoff
        if not (keep_daily or keep_monthly):
            f.unlink(missing_ok=True)


def backup_info() -> dict:
    if not BACKUP_DIR.exists():
        return {"last_backup": None, "backup_count": 0, "backup_dir": str(BACKUP_DIR)}
    files = [f for f in BACKUP_DIR.glob("dreams-*.db") if "pre-migration" not in f.name]
    dates = sorted(d for d in (_parse_date(f.name) for f in files) if d)
    return {
        "last_backup": dates[-1].isoformat() if dates else None,
        "backup_count": len(files),
        "backup_dir": str(BACKUP_DIR),
    }
