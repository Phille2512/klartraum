"""S.1-Logik direkt getestet (ergänzend zu S.2). Arbeitet ausschließlich auf
der Test-Datenbank aus conftest.py (KLARTRAUM_DATA zeigt auf ein Temp-Verzeichnis)."""
import datetime as dt
import shutil

import pytest

import backup


@pytest.fixture(autouse=True)
def _clean_backup_dir():
    """Eigene Isolation für dieses Modul: der Backup-Ordner wird von der
    session-weiten _fresh_db-Fixture nicht zurückgesetzt (die kümmert sich
    nur um die DB-Tabellen), deshalb hier separat vor jedem Test leeren."""
    if backup.BACKUP_DIR.exists():
        shutil.rmtree(backup.BACKUP_DIR)
    yield
    if backup.BACKUP_DIR.exists():
        shutil.rmtree(backup.BACKUP_DIR)


def test_no_backup_without_existing_db(tmp_path, monkeypatch):
    monkeypatch.setattr(backup, "DB_PATH", tmp_path / "nicht-vorhanden.db")
    assert backup.create_daily_backup_if_missing() is False


def test_two_calls_same_day_create_exactly_one_backup():
    created_first = backup.create_daily_backup_if_missing()
    created_second = backup.create_daily_backup_if_missing()
    files = list(backup.BACKUP_DIR.glob("dreams-*.db"))
    assert created_first is True
    assert created_second is False
    assert len(files) == 1


def test_pre_migration_backup_created_once():
    backup.create_pre_migration_backup()
    backup.create_pre_migration_backup()
    files = list(backup.BACKUP_DIR.glob("dreams-pre-migration-*.db"))
    assert len(files) == 1


def test_rotation_keeps_recent_and_drops_old_non_anchor():
    today = dt.date.today()
    backup.create_daily_backup_if_missing()  # heutiges Backup als Quelle für _backup_file

    recent = backup._daily_backup_path(today - dt.timedelta(days=5))
    shutil.copy2(backup._daily_backup_path(today), recent)

    # zwei Backups im selben, länger zurückliegenden Monat: das frühere wird
    # zum Monats-Anker, das spätere darf gelöscht werden
    earlier_in_month = backup._daily_backup_path(today - dt.timedelta(days=25))
    later_in_month = backup._daily_backup_path(today - dt.timedelta(days=20))
    shutil.copy2(backup._daily_backup_path(today), earlier_in_month)
    shutil.copy2(backup._daily_backup_path(today), later_in_month)

    backup._rotate()
    remaining = {f.name for f in backup.BACKUP_DIR.glob("dreams-*.db")}

    assert recent.name in remaining
    assert earlier_in_month.name in remaining  # Monats-Anker bleibt
    assert later_in_month.name not in remaining  # nicht Anker, älter als 14 Tage


def test_rotation_keeps_monthly_anchor_within_six_months_drops_older():
    today = dt.date.today()
    backup.create_daily_backup_if_missing()

    def months_ago_first(months: int) -> dt.date:
        year, month = today.year, today.month - months
        while month <= 0:
            month += 12
            year -= 1
        return dt.date(year, month, 1)

    anchor_within = backup._daily_backup_path(months_ago_first(3))
    anchor_too_old = backup._daily_backup_path(months_ago_first(8))
    shutil.copy2(backup._daily_backup_path(today), anchor_within)
    shutil.copy2(backup._daily_backup_path(today), anchor_too_old)

    backup._rotate()
    remaining = {f.name for f in backup.BACKUP_DIR.glob("dreams-*.db")}

    assert anchor_within.name in remaining
    assert anchor_too_old.name not in remaining


def test_pre_migration_backup_never_rotated():
    backup.create_daily_backup_if_missing()
    backup.create_pre_migration_backup()
    old_pre = backup.BACKUP_DIR / "dreams-pre-migration-2020-01-01.db"
    shutil.copy2(backup._daily_backup_path(dt.date.today()), old_pre)

    backup._rotate()
    assert old_pre.exists()


def test_restore_roundtrip(tmp_path):
    """Akzeptanzkriterium: Restore einmal wirklich durchspielen."""
    import sqlite3

    # Testdatensatz anlegen: Titel schreiben, sichern, ändern, wiederherstellen
    conn = sqlite3.connect(str(backup.DB_PATH))
    conn.execute("CREATE TABLE IF NOT EXISTS marker (id INTEGER PRIMARY KEY, value TEXT)")
    conn.execute("DELETE FROM marker")
    conn.execute("INSERT INTO marker (value) VALUES ('vor-backup')")
    conn.commit()
    conn.close()

    backup.create_daily_backup_if_missing()
    todays_backup = backup._daily_backup_path(dt.date.today())
    assert todays_backup.exists()

    conn = sqlite3.connect(str(backup.DB_PATH))
    conn.execute("UPDATE marker SET value = 'veraendert-nach-backup'")
    conn.commit()
    conn.close()

    # Restore: Server-Stop wird hier durch einfaches Zurückkopieren simuliert
    shutil.copy2(todays_backup, backup.DB_PATH)

    conn = sqlite3.connect(str(backup.DB_PATH))
    value = conn.execute("SELECT value FROM marker").fetchone()[0]
    conn.close()
    assert value == "vor-backup"


def test_backup_info_reports_last_backup_and_count():
    assert backup.backup_info()["last_backup"] is None
    assert backup.backup_info()["backup_count"] == 0

    backup.create_daily_backup_if_missing()
    info = backup.backup_info()
    assert info["last_backup"] == dt.date.today().isoformat()
    assert info["backup_count"] == 1
    assert info["backup_dir"] == str(backup.BACKUP_DIR)
