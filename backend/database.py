from sqlmodel import Session, SQLModel, create_engine

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
        tag_cols = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info(tag)")}
        if "category" not in tag_cols:
            conn.exec_driver_sql("ALTER TABLE tag ADD COLUMN category VARCHAR")
        if "archetype" not in tag_cols:
            conn.exec_driver_sql("ALTER TABLE tag ADD COLUMN archetype VARCHAR")
        if "region_id" not in tag_cols:
            conn.exec_driver_sql("ALTER TABLE tag ADD COLUMN region_id INTEGER")
        conn.commit()


def get_session():
    with Session(engine) as session:
        yield session
