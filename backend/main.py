"""S.3: App-Factory, Middleware, Static Files, Router-Includes.
Die Endpunkte selbst leben in routers/ (reine Umzugsarbeit aus dem
ehemals >1.100 Zeilen langen main.py, kein Verhalten geändert)."""
import datetime as dt
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles

import backup
import recovery
from database import init_db
from paths import DATA_DIR, FRONTEND_DIR, frontend_version
from routers import atlas, auth, cycle, dreams, export, jung, map as map_router, nights, stats, tags

# S.4: einmal beim Serverstart berechnet, siehe frontend_version() in paths.py
FRONTEND_VERSION = frontend_version()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Integritäts-Check VOR allem anderen: Von einer beschädigten DB darf
    # weder ein Backup gezogen noch eine Migration darauf losgelassen werden.
    # Im Recovery-Modus bedient die App nur auth/health/recovery (s. Middleware);
    # die Wiederherstellung selbst räumt auf und ruft init_db() nach.
    if recovery.startup_check():
        print("  ⚠️  dreams.db ist beschädigt — Recovery-Modus aktiv "
              "(Wiederherstellung über die App-Oberfläche).")
        yield
        return
    # S.1: Backup-Fehler dürfen den Serverstart nicht verhindern.
    try:
        backup.create_daily_backup_if_missing()
    except Exception:
        traceback.print_exc()
    init_db()
    yield


app = FastAPI(title="Traumader", lifespan=lifespan)


def _log_error(request_path: str) -> None:
    """Traceback zusätzlich nach DATA_DIR/fehler.log schreiben — das
    Konsolenfenster der Desktop-App scrollt weg bzw. ist beim Melden längst
    zu; die Datei können Nutzer (z. B. Freunde auf Windows) einfach schicken.
    encoding="utf-8" ist Pflicht: Windows schreibt sonst cp1252 und stolpert
    über Emojis/Traumtexte im Traceback."""
    try:
        log = DATA_DIR / "fehler.log"
        if log.exists() and log.stat().st_size > 512_000:
            log.replace(DATA_DIR / "fehler.log.alt")  # eine Rotation genügt
        with log.open("a", encoding="utf-8") as f:
            f.write(f"\n[{dt.datetime.now().isoformat(timespec='seconds')}] {request_path}\n")
            f.write(traceback.format_exc())
    except Exception:
        pass  # Fehler-Logging darf nie selbst einen Fehler auslösen


@app.middleware("http")
async def no_cache_static(request, call_next):
    # Browser sollen Frontend-Dateien immer gegen den Server prüfen (304, wenn
    # unverändert) – sonst bleiben nach Updates alte Versionen im HTTP-Cache hängen.
    #
    # S.4: try/except hier statt eines separaten @app.exception_handler(Exception) —
    # BaseHTTPMiddleware (was @app.middleware("http") verwendet) lässt Fehler aus
    # call_next() sonst als ExceptionGroup nach außen durchschlagen, statt sie an
    # einen registrierten Exception-Handler weiterzureichen. Saubere JSON-Antwort
    # statt HTML-Traceback; voller Traceback ins Server-Log. HTTPException
    # (404, 401, 422, ...) läuft unverändert durch call_next() als normale Response.
    # Recovery-Modus: statt zufälliger 500er auf der kaputten DB bekommt
    # jeder Daten-Endpoint ein klares 503 db_defect — das Frontend zeigt
    # daraufhin die Wiederherstellungs-Karte. auth/health/recovery bleiben
    # erreichbar (Login läuft über auth.json, nicht über die DB).
    path = request.url.path
    if (
        recovery.STATE["defect"]
        and path.startswith("/api/")
        and not path.startswith(("/api/auth", "/api/health", "/api/recovery"))
    ):
        return JSONResponse(status_code=503, content={"detail": "db_defect"})
    try:
        response = await call_next(request)
    except Exception:
        traceback.print_exc()
        _log_error(request.url.path)
        return JSONResponse(status_code=500, content={"detail": "internal_error"})
    if not request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache"
    return response


@app.get("/api/health")
def health():
    return {"status": "ok", "version": FRONTEND_VERSION}


@app.get("/sw.js")
def service_worker():
    # S.4: __VERSION__-Platzhalter durch den beim Start berechneten Hash
    # ersetzen — die manuelle Cache-Versionierung in sw.js entfällt.
    content = (FRONTEND_DIR / "sw.js").read_text().replace("__VERSION__", FRONTEND_VERSION)
    return Response(content, media_type="application/javascript")


# auth.router ist ungeschützt (/api/auth/*); alle anderen erfordern ein Token
# (dependencies=[Depends(require_auth)], siehe deps.py und jeweiliges Router-Modul)
app.include_router(auth.router)
app.include_router(dreams.router)
app.include_router(tags.router)
app.include_router(cycle.router)
app.include_router(stats.router)
app.include_router(atlas.router)
app.include_router(map_router.router)
app.include_router(jung.router)
app.include_router(export.router)
app.include_router(nights.router)
app.include_router(recovery.router)

# Frontend zuletzt mounten (und /sw.js VOR dem Mount registriert, damit die
# eigene Route Vorrang vor der statischen Datei hat); /api/* hat ohnehin Vorrang
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
