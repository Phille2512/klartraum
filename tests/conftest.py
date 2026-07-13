"""S.2 (Sicherheitsnetz): gemeinsame Test-Fixtures.

WICHTIG: KLARTRAUM_DATA wird gesetzt, BEVOR irgendein Backend-Modul
importiert wird — paths.py liest die Umgebungsvariable beim Import und
legt DATA_DIR unveränderlich fest. Dadurch ist die echte Datenbank des
Nutzers (~/Traumader bzw. ~/Klartraum) physisch unerreichbar für Tests:
selbst ein Bug in einem Test kann sie nicht anfassen.
"""
import os
import sys
import tempfile
from pathlib import Path

import pytest

_TEST_DATA_DIR = tempfile.mkdtemp(prefix="traumader-test-")
os.environ["KLARTRAUM_DATA"] = _TEST_DATA_DIR
os.environ.pop("TRAUMADER_DATA", None)  # falls in der Shell gesetzt: Vorrang vermeiden

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient  # noqa: E402

from database import engine, init_db  # noqa: E402
from main import app  # noqa: E402
from sqlmodel import SQLModel  # noqa: E402

import auth as auth_module  # noqa: E402


@pytest.fixture(autouse=True)
def _fresh_db():
    """Vor jedem einzelnen Test: Schema komplett neu aufsetzen und die
    Auth-Datei löschen. Stärker als "frisch pro Modul" aus dem Plan — so
    ist ausgeschlossen, dass Tests von der Reihenfolge abhängen."""
    SQLModel.metadata.drop_all(engine)
    init_db()
    if auth_module.AUTH_PATH.exists():
        auth_module.AUTH_PATH.unlink()
    yield


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def auth_client(client):
    """TestClient mit bereits gesetztem Passwort und gültigem Token im Header."""
    resp = client.post("/api/auth/setup", json={"password": "testpasswort"})
    assert resp.status_code == 200, resp.text
    token = resp.json()["token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
