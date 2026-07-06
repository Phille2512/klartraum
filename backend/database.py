from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

DB_PATH = Path(__file__).parent / "dreams.db"

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)


def init_db() -> None:
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
        tag_cols = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info(tag)")}
        if "category" not in tag_cols:
            conn.exec_driver_sql("ALTER TABLE tag ADD COLUMN category VARCHAR")
        conn.commit()


def get_session():
    with Session(engine) as session:
        yield session
