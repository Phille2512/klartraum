"""Recovery (beschädigte dreams.db): Integritäts-Check, Backup-Auswahl,
503-Schutzschild im Recovery-Modus und Ein-Klick-Wiederherstellung."""
import shutil

import pytest
from sqlmodel import Session, select

import database
import recovery
from backup import BACKUP_DIR
from models import Dream


@pytest.fixture(autouse=True)
def _clean_recovery_state():
    """Recovery-Zustand nie in andere Tests durchsickern lassen."""
    yield
    recovery.STATE["defect"] = False
    recovery.STATE["backup"] = None
    if BACKUP_DIR.exists():
        shutil.rmtree(BACKUP_DIR)


def _corrupt(path):
    path.write_bytes(b"kaputt" * 100)


def test_check_integrity():
    assert recovery.check_integrity(database.DB_PATH) is True  # frische Test-DB
    assert recovery.check_integrity(database.DB_PATH.with_name("gibtsnicht.db")) is True
    broken = database.DB_PATH.with_name("broken.db")
    _corrupt(broken)
    assert recovery.check_integrity(broken) is False
    broken.unlink()


def test_find_last_healthy_backup_ueberspringt_kaputte(tmp_path):
    assert recovery.find_last_healthy_backup(tmp_path / "leer") is None
    bdir = tmp_path / "backups"
    bdir.mkdir()
    old_healthy = bdir / "dreams-2026-07-01.db"
    shutil.copy2(database.DB_PATH, old_healthy)
    new_broken = bdir / "dreams-2026-07-15.db"
    _corrupt(new_broken)
    # jüngstes Backup ist kaputt -> das ältere gesunde gewinnt
    assert recovery.find_last_healthy_backup(bdir) == old_healthy


def test_startup_check_gesund():
    assert recovery.startup_check() is False
    assert recovery.STATE["defect"] is False


def test_recovery_modus_schutzschild(auth_client):
    recovery.STATE["defect"] = True
    r = auth_client.get("/api/dreams")
    assert r.status_code == 503
    assert r.json() == {"detail": "db_defect"}
    assert auth_client.get("/api/health").status_code == 200
    s = auth_client.get("/api/recovery/status")
    assert s.status_code == 200
    assert s.json()["defect"] is True


def test_restore_ohne_defekt_abgelehnt(auth_client):
    r = auth_client.post("/api/recovery/restore")
    assert r.status_code == 409
    assert r.json()["detail"] == "db_not_defect"


def test_restore_ohne_gesundes_backup(auth_client):
    # init_db() legt einen Pre-Migration-Snapshot an (Beifuß-Altlast) —
    # für den "kein Backup"-Fall muss das Verzeichnis wirklich leer sein.
    if BACKUP_DIR.exists():
        shutil.rmtree(BACKUP_DIR)
    recovery.STATE["defect"] = True
    r = auth_client.post("/api/recovery/restore")
    assert r.status_code == 409
    assert r.json()["detail"] == "no_healthy_backup"


def test_restore_kompletter_ablauf(auth_client):
    # 1) Ein Traum ist gespeichert und im "gesunden" Backup enthalten
    r = auth_client.post("/api/dreams", json={"date": "2026-07-19", "title": "TEST-Rettung"})
    assert r.status_code == 201
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    database.engine.dispose()
    shutil.copy2(database.DB_PATH, BACKUP_DIR / "dreams-2026-07-19.db")

    # 2) Danach geht die Live-DB kaputt
    _corrupt(database.DB_PATH)
    assert recovery.startup_check() is True
    assert recovery.STATE["backup"] is not None

    # 3) Ein Klick stellt wieder her
    r = auth_client.post("/api/recovery/restore")
    assert r.status_code == 200
    body = r.json()
    assert body["restored_from"] == "dreams-2026-07-19.db"
    assert body["defect_saved_as"].startswith("dreams-defekt-")

    # 4) Kaputte Datei aufgehoben, Traum wieder da, Schutzschild offen
    assert (database.DB_PATH.parent / body["defect_saved_as"]).exists()
    with Session(database.engine) as session:
        titles = [d.title for d in session.exec(select(Dream)).all()]
    assert "TEST-Rettung" in titles
    assert auth_client.get("/api/dreams").status_code == 200
