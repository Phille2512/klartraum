"""Integritäts-Check + Ein-Klick-Wiederherstellung aus dem letzten gesunden
Backup. Anlass (20.07.2026): beschädigte dreams.db auf einem Windows-Rechner —
statt kryptischer 500er beim Speichern soll der Nutzer eine freundliche
Wiederherstellungs-Karte sehen.

Grundsätze (Nutzerdaten sind heilig, Konvention 7):
- Die beschädigte Datei wird NIE gelöscht, nur umbenannt
  (dreams-defekt-<Zeitstempel>.db).
- Backups werden vor dem Anbieten selbst per integrity_check geprüft.
- Ohne ausdrücklichen Klick des Nutzers wird nichts wiederhergestellt.
"""
import datetime as dt
import shutil
import sqlite3
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

import database
from backup import BACKUP_DIR
from deps import require_auth

router = APIRouter(prefix="/api/recovery", dependencies=[Depends(require_auth)])

# Vom Serverstart gesetzt (main.lifespan). Single-User-App → einfacher
# Modulzustand statt app.state; die Middleware in main.py liest ihn mit.
STATE = {"defect": False, "backup": None}


def check_integrity(path: Path) -> bool:
    """True = Datei ist eine gesunde SQLite-DB (oder existiert noch nicht)."""
    if not path.exists():
        return True  # Neuinstallation: kein Defekt
    try:
        conn = sqlite3.connect(str(path))
        try:
            row = conn.execute("PRAGMA integrity_check").fetchone()
            return bool(row) and row[0] == "ok"
        finally:
            conn.close()
    except sqlite3.Error:
        return False


def find_last_healthy_backup(backup_dir: Path | None = None) -> Path | None:
    """Jüngstes Backup, das den Integritäts-Check besteht (auch ein Backup
    kann beschädigt sein, z. B. wenn es von einer schon kaputten DB gezogen
    wurde)."""
    backup_dir = backup_dir if backup_dir is not None else BACKUP_DIR
    if not backup_dir.exists():
        return None
    candidates = sorted(
        backup_dir.glob("dreams-*.db"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for candidate in candidates:
        if check_integrity(candidate):
            return candidate
    return None


def startup_check() -> bool:
    """Beim Serverstart aufrufen. True = DB defekt → Recovery-Modus."""
    if check_integrity(database.DB_PATH):
        STATE["defect"] = False
        STATE["backup"] = None
        return False
    STATE["defect"] = True
    STATE["backup"] = find_last_healthy_backup()
    return True


def restore() -> dict:
    """Kaputte DB beiseitelegen, gesundes Backup einsetzen, Migrationen
    laufen lassen (das Backup kann ein älteres Schema haben)."""
    backup_path = find_last_healthy_backup()
    if backup_path is None:
        raise HTTPException(status_code=409, detail="no_healthy_backup")
    # Offene Verbindungen loslassen — sonst scheitert das Umbenennen
    # (Windows sperrt geöffnete Dateien).
    database.engine.dispose()
    defect_saved_as = None
    if database.DB_PATH.exists():
        stamp = dt.datetime.now().strftime("%Y-%m-%d-%H%M%S")
        defect_path = database.DB_PATH.with_name(f"dreams-defekt-{stamp}.db")
        database.DB_PATH.replace(defect_path)
        defect_saved_as = defect_path.name
    shutil.copy2(backup_path, database.DB_PATH)
    database.init_db()
    STATE["defect"] = False
    STATE["backup"] = None
    return {"restored_from": backup_path.name, "defect_saved_as": defect_saved_as}


@router.get("/status")
def status():
    b = STATE["backup"] if STATE["defect"] else None
    return {
        "defect": STATE["defect"],
        "backup": b.name if b else None,
        "backup_date": dt.date.fromtimestamp(b.stat().st_mtime).isoformat() if b else None,
    }


@router.post("/restore")
def do_restore():
    if not STATE["defect"]:
        raise HTTPException(status_code=409, detail="db_not_defect")
    return restore()
