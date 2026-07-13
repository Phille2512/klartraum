"""S.3: App-Factory, Middleware, Static Files, Router-Includes.
Die Endpunkte selbst leben in routers/ (reine Umzugsarbeit aus dem
ehemals >1.100 Zeilen langen main.py, kein Verhalten geändert)."""
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

import backup
from database import init_db
from paths import FRONTEND_DIR
from routers import atlas, auth, cycle, dreams, export, jung, map as map_router, stats, tags


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
    response = await call_next(request)
    if not request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache"
    return response


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

# Frontend zuletzt mounten, damit /api/* Vorrang hat
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
