"""S.3: gemeinsame Dependencies für alle Router (reine Umzugsarbeit aus main.py)."""
from fastapi import Header, HTTPException

import auth
from database import get_session  # noqa: F401  (Re-Export für Router-Module)


def require_auth(authorization: str | None = Header(default=None)):
    token = authorization.removeprefix("Bearer ").strip() if authorization else ""
    if not auth.verify_token(token):
        raise HTTPException(401, "Nicht angemeldet")
