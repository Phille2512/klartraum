"""Einfacher Passwortschutz: ein Passwort (als PBKDF2-Hash gespeichert),
pro angemeldetem Gerät ein zufälliges Token. Alles liegt in auth.json
(git-ignoriert), keine Datenbanktabelle nötig."""
import hashlib
import json
import secrets

from paths import DATA_DIR

AUTH_PATH = DATA_DIR / "auth.json"
ITERATIONS = 200_000
MAX_TOKENS = 10  # ältestes Gerät fliegt raus, wenn mehr angemeldet werden


def _load() -> dict | None:
    if not AUTH_PATH.exists():
        return None
    return json.loads(AUTH_PATH.read_text())


def _save(data: dict) -> None:
    AUTH_PATH.write_text(json.dumps(data))


def _hash(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), ITERATIONS
    ).hex()


def is_configured() -> bool:
    return _load() is not None


def set_password(password: str) -> None:
    salt = secrets.token_hex(16)
    _save({"salt": salt, "hash": _hash(password, salt), "tokens": []})


def verify_password(password: str) -> bool:
    data = _load()
    if not data:
        return False
    return secrets.compare_digest(_hash(password, data["salt"]), data["hash"])


def create_token() -> str:
    data = _load()
    token = secrets.token_urlsafe(32)
    data["tokens"] = (data["tokens"] + [token])[-MAX_TOKENS:]
    _save(data)
    return token


def verify_token(token: str) -> bool:
    data = _load()
    if not data or not token:
        return False
    return any(secrets.compare_digest(token, t) for t in data["tokens"])
