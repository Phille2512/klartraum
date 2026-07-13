"""S.3: App-Factory, Middleware, Static Files, Router-Includes.
Die Endpunkte selbst leben in routers/ (reine Umzugsarbeit aus dem
ehemals >1.100 Zeilen langen main.py, kein Verhalten geändert)."""
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles

import backup
from database import init_db
from paths import FRONTEND_DIR, frontend_version
from routers import atlas, auth, cycle, dreams, export, jung, map as map_router, stats, tags

# S.4: einmal beim Serverstart berechnet, siehe frontend_version() in paths.py
FRONTEND_VERSION = frontend_version()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # S.1: Backup-Fehler dürfen den Serverstart nicht verhindern.
    try:
        backup.create_daily_backup_if_missing()
    except Exception:
        traceback.print_exc()
    init_db()
    yield


app = FastAPI(title="Traumader", lifespan=lifespan)


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
    try:
        response = await call_next(request)
    except Exception:
        traceback.print_exc()
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

# Frontend zuletzt mounten (und /sw.js VOR dem Mount registriert, damit die
# eigene Route Vorrang vor der statischen Datei hat); /api/* hat ohnehin Vorrang
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
