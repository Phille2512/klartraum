"""S.3: Auth-Endpunkte — UNGESCHÜTZT (kein require_auth), Umzugsarbeit aus main.py."""
from fastapi import APIRouter, HTTPException

import auth
from schemas import PasswordIn

router = APIRouter(prefix="/api/auth")


@router.get("/status")
def auth_status():
    return {"configured": auth.is_configured()}


@router.post("/setup")
def auth_setup(payload: PasswordIn):
    if auth.is_configured():
        raise HTTPException(409, "Passwort ist bereits festgelegt")
    auth.set_password(payload.password)
    return {"token": auth.create_token()}


@router.post("/login")
def auth_login(payload: PasswordIn):
    if not auth.verify_password(payload.password):
        raise HTTPException(401, "Falsches Passwort")
    return {"token": auth.create_token()}
