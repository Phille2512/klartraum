"""TD.1: Migration einer bestehenden `night`-Tabelle (vor den Tracker-Spalten)
auf das neue Schema -- simuliert den echten Upgrade-Fall (Philipps
bestehende dreams.db kennt diese Spalten noch nicht)."""
from database import _migrate, engine


def test_migration_adds_tracker_columns_and_preserves_existing_data(auth_client):
    # Bestehende Nacht anlegen (heutiges Schema inkl. TD.1-Spalten, da
    # _fresh_db bereits das volle Modell erzeugt hat) ...
    auth_client.put("/api/nights/2026-07-01", json={"bed_time": "23:00", "wake_time": "07:00"})

    with engine.connect() as conn:
        # ... dann die Tabelle auf den ALTEN Stand zurückbauen (Tracker-Spalten
        # entfernen), um eine vor-TD.1-Datenbank nachzustellen. SQLite kennt
        # kein DROP COLUMN vor 3.35 -- Tabelle neu aufbauen ist hier einfacher
        # und ausreichend fürs Testziel.
        conn.exec_driver_sql("ALTER TABLE night RENAME TO night_old")
        conn.exec_driver_sql(
            """
            CREATE TABLE night (
                date DATE NOT NULL PRIMARY KEY,
                bed_time VARCHAR,
                wake_time VARCHAR,
                sleep_minutes INTEGER,
                confidence VARCHAR NOT NULL
            )
            """
        )
        conn.exec_driver_sql(
            "INSERT INTO night (date, bed_time, wake_time, sleep_minutes, confidence) "
            "SELECT date, bed_time, wake_time, sleep_minutes, confidence FROM night_old"
        )
        conn.exec_driver_sql("DROP TABLE night_old")
        conn.commit()

        cols_before = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info(night)")}
        assert "source" not in cols_before
        assert "stages_json" not in cols_before

    _migrate()

    with engine.connect() as conn:
        cols_after = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info(night)")}
        for col in (
            "source", "rem_minutes", "deep_minutes", "light_minutes", "awake_minutes",
            "awakenings", "tracker_score", "hr_min", "hr_avg", "hr_max",
            "sleep_latency_minutes", "stages_json",
        ):
            assert col in cols_after, f"Spalte {col} fehlt nach Migration"

        row = conn.exec_driver_sql(
            "SELECT bed_time, wake_time, sleep_minutes, confidence, source FROM night WHERE date = '2026-07-01'"
        ).first()
        assert row == ("23:00", "07:00", 480, "exact", "manual")


def test_migration_is_idempotent(auth_client):
    # Zweiter Lauf auf bereits vollständigem Schema darf nichts kaputt machen.
    _migrate()
    _migrate()
    resp = auth_client.get("/api/nights/latest-exact")
    assert resp.status_code == 200
