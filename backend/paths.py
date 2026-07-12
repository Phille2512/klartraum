import os
import shutil
import sys
from pathlib import Path

def _default_data_dir() -> Path:
    # T.1 (Umbenennung Klartraum -> Traumader): bestehende Installationen mit
    # ~/Klartraum/ nicht anfassen (weiterverwenden, nichts kopieren);
    # Neuinstallationen bekommen ~/Traumader/.
    traumader_dir = Path.home() / "Traumader"
    klartraum_dir = Path.home() / "Klartraum"
    if traumader_dir.exists():
        return traumader_dir
    if klartraum_dir.exists():
        return klartraum_dir
    return traumader_dir


DATA_DIR = Path(os.environ.get("TRAUMADER_DATA", os.environ.get("KLARTRAUM_DATA", _default_data_dir())))
DATA_DIR.mkdir(parents=True, exist_ok=True)

BACKEND_DIR = Path(__file__).parent

FRONTEND_DIR = Path(getattr(sys, "_MEIPASS", BACKEND_DIR.parent)) / "frontend"


def migrate_legacy_data() -> None:
    legacy_db = BACKEND_DIR / "dreams.db"
    new_db = DATA_DIR / "dreams.db"
    if legacy_db.exists() and not new_db.exists():
        shutil.copy2(legacy_db, new_db)
        print(f"  Datenbank kopiert: {legacy_db} -> {new_db}")

    legacy_auth = BACKEND_DIR / "auth.json"
    new_auth = DATA_DIR / "auth.json"
    if legacy_auth.exists() and not new_auth.exists():
        shutil.copy2(legacy_auth, new_auth)
        print(f"  Auth kopiert: {legacy_auth} -> {new_auth}")

    legacy_audio = BACKEND_DIR / "audio"
    new_audio = DATA_DIR / "audio"
    if legacy_audio.exists() and not new_audio.exists():
        shutil.copytree(legacy_audio, new_audio)
        print(f"  Audio kopiert: {legacy_audio} -> {new_audio}")
