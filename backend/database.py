from sqlmodel import Session, SQLModel, create_engine

import backup
from paths import DATA_DIR, migrate_legacy_data

DB_PATH = DATA_DIR / "dreams.db"

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)


def init_db() -> None:
    migrate_legacy_data()
    SQLModel.metadata.create_all(engine)
    _migrate()


def _migrate() -> None:
    # create_all legt nur neue Tabellen an – neue Spalten in bestehenden
    # Tabellen müssen per ALTER TABLE nachgezogen werden.
    with engine.connect() as conn:
        dream_cols = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info(dream)")}
        tag_cols = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info(tag)")}
        night_cols = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info(night)")}

        phenomen_cols = (
            "falsches_erwachen", "schlafparalyse", "traum_im_traum", "wiederkehrend", "albtraum",
        )
        # TD.1: Tracker-Vokabular der Nacht (Spaltenname -> SQL-Typ fuer ALTER TABLE)
        night_tracker_cols = {
            "source": "VARCHAR NOT NULL DEFAULT 'manual'",
            "rem_minutes": "INTEGER",
            "deep_minutes": "INTEGER",
            "light_minutes": "INTEGER",
            "awake_minutes": "INTEGER",
            "awakenings": "INTEGER",
            "tracker_score": "INTEGER",
            "hr_min": "INTEGER",
            "hr_avg": "INTEGER",
            "hr_max": "INTEGER",
            "sleep_latency_minutes": "INTEGER",
            "stages_json": "VARCHAR",
        }
        pending = (
            "beifuss" not in dream_cols
            or "emotions" not in dream_cols
            or "big_dream" not in dream_cols
            or "category" not in tag_cols
            or "archetype" not in tag_cols
            or "region_id" not in tag_cols
            or any(col not in dream_cols for col in phenomen_cols)
            or "substances" not in dream_cols
            or "substance_other" not in dream_cols
            or any(col not in night_cols for col in night_tracker_cols)
        )
        if pending:
            # S.1: vor jedem tatsächlichen ALTER TABLE einen Extra-Snapshot,
            # unabhängig vom täglichen Rotations-Backup.
            backup.create_pre_migration_backup()

        if "beifuss" not in dream_cols:
            conn.exec_driver_sql(
                "ALTER TABLE dream ADD COLUMN beifuss INTEGER NOT NULL DEFAULT 0"
            )
        if "emotions" not in dream_cols:
            conn.exec_driver_sql("ALTER TABLE dream ADD COLUMN emotions VARCHAR")
        if "big_dream" not in dream_cols:
            conn.exec_driver_sql(
                "ALTER TABLE dream ADD COLUMN big_dream INTEGER NOT NULL DEFAULT 0"
            )
        if "category" not in tag_cols:
            conn.exec_driver_sql("ALTER TABLE tag ADD COLUMN category VARCHAR")
        if "archetype" not in tag_cols:
            conn.exec_driver_sql("ALTER TABLE tag ADD COLUMN archetype VARCHAR")
        if "region_id" not in tag_cols:
            conn.exec_driver_sql("ALTER TABLE tag ADD COLUMN region_id INTEGER")
        for col in phenomen_cols:
            if col not in dream_cols:
                conn.exec_driver_sql(
                    f"ALTER TABLE dream ADD COLUMN {col} INTEGER NOT NULL DEFAULT 0"
                )
        if "substances" not in dream_cols:
            conn.exec_driver_sql("ALTER TABLE dream ADD COLUMN substances VARCHAR")
        if "substance_other" not in dream_cols:
            conn.exec_driver_sql("ALTER TABLE dream ADD COLUMN substance_other VARCHAR")
        for col, sql_type in night_tracker_cols.items():
            if col not in night_cols:
                conn.exec_driver_sql(f"ALTER TABLE night ADD COLUMN {col} {sql_type}")
        # Beifuß-Ablösung: alte bool-Spalte einmalig in die neue Substanzen-Liste
        # überführen (Abfrage bleibt für spätere Starts wirkungslos, da substances
        # danach nicht mehr leer ist).
        conn.exec_driver_sql(
            "UPDATE dream SET substances = 'beifuss' "
            "WHERE beifuss = 1 AND (substances IS NULL OR substances = '')"
        )
        conn.commit()


def get_session():
    with Session(engine) as session:
        yield session
