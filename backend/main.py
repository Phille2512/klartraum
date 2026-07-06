import datetime as dt
from collections import Counter
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field as PField
from sqlmodel import Session, col, select

import auth
from database import get_session, init_db
from models import Dream, DreamTag, Tag

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Klartraum-App", lifespan=lifespan)


@app.middleware("http")
async def no_cache_static(request, call_next):
    # Browser sollen Frontend-Dateien immer gegen den Server prüfen (304, wenn
    # unverändert) – sonst bleiben nach Updates alte Versionen im HTTP-Cache hängen.
    response = await call_next(request)
    if not request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache"
    return response


# ---------- Authentifizierung ----------

def require_auth(authorization: str | None = Header(default=None)):
    token = authorization.removeprefix("Bearer ").strip() if authorization else ""
    if not auth.verify_token(token):
        raise HTTPException(401, "Nicht angemeldet")


class PasswordIn(BaseModel):
    password: str = PField(min_length=4)


@app.get("/api/auth/status")
def auth_status():
    return {"configured": auth.is_configured()}


@app.post("/api/auth/setup")
def auth_setup(payload: PasswordIn):
    if auth.is_configured():
        raise HTTPException(409, "Passwort ist bereits festgelegt")
    auth.set_password(payload.password)
    return {"token": auth.create_token()}


@app.post("/api/auth/login")
def auth_login(payload: PasswordIn):
    if not auth.verify_password(payload.password):
        raise HTTPException(401, "Falsches Passwort")
    return {"token": auth.create_token()}


# Alle Daten-Endpunkte erfordern ein gültiges Token
router = APIRouter(prefix="/api", dependencies=[Depends(require_auth)])


# ---------- Schemas (API-Eingabe/-Ausgabe) ----------

class DreamIn(BaseModel):
    date: dt.date
    title: str
    content: str = ""
    lucidity: int = PField(default=2, ge=0, le=4)
    sleep_quality: int | None = PField(default=None, ge=1, le=5)
    beifuss: bool = False
    notes_analysis: str | None = None
    tags: list[str] = []
    dream_signs: list[str] = []


class DreamOut(BaseModel):
    id: int
    date: dt.date
    title: str
    content: str
    lucidity: int
    sleep_quality: int | None
    beifuss: bool
    notes_analysis: str | None
    tags: list[str]
    dream_signs: list[str]


def to_out(dream: Dream) -> DreamOut:
    return DreamOut(
        id=dream.id,
        date=dream.date,
        title=dream.title,
        content=dream.content,
        lucidity=dream.lucidity,
        sleep_quality=dream.sleep_quality,
        beifuss=dream.beifuss,
        notes_analysis=dream.notes_analysis,
        tags=sorted(t.name for t in dream.tags if t.kind == "tag"),
        dream_signs=sorted(t.name for t in dream.tags if t.kind == "dream_sign"),
    )


def get_or_create_tag(session: Session, name: str, kind: str) -> Tag:
    name = name.strip().lower()
    tag = session.exec(
        select(Tag).where(Tag.name == name, Tag.kind == kind)
    ).first()
    if not tag:
        tag = Tag(name=name, kind=kind)
        session.add(tag)
        session.flush()
    return tag


def apply_tags(session: Session, dream: Dream, payload: DreamIn) -> None:
    tags = [get_or_create_tag(session, n, "tag") for n in payload.tags if n.strip()]
    signs = [get_or_create_tag(session, n, "dream_sign") for n in payload.dream_signs if n.strip()]
    dream.tags = tags + signs


# ---------- Träume ----------

@router.get("/dreams", response_model=list[DreamOut])
def list_dreams(
    search: str | None = None,
    tag: str | None = None,
    date_from: dt.date | None = Query(default=None, alias="from"),
    date_to: dt.date | None = Query(default=None, alias="to"),
    session: Session = Depends(get_session),
):
    stmt = select(Dream).order_by(col(Dream.date).desc(), col(Dream.id).desc())
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            col(Dream.title).ilike(pattern) | col(Dream.content).ilike(pattern)
        )
    if date_from:
        stmt = stmt.where(Dream.date >= date_from)
    if date_to:
        stmt = stmt.where(Dream.date <= date_to)
    if tag:
        stmt = stmt.join(DreamTag, col(DreamTag.dream_id) == col(Dream.id)).join(
            Tag, col(Tag.id) == col(DreamTag.tag_id)
        ).where(Tag.name == tag.strip().lower())
    dreams = session.exec(stmt).unique().all()
    return [to_out(d) for d in dreams]


@router.post("/dreams", response_model=DreamOut, status_code=201)
def create_dream(payload: DreamIn, session: Session = Depends(get_session)):
    dream = Dream(**payload.model_dump(exclude={"tags", "dream_signs"}))
    apply_tags(session, dream, payload)
    session.add(dream)
    session.commit()
    session.refresh(dream)
    return to_out(dream)


@router.get("/dreams/{dream_id}", response_model=DreamOut)
def get_dream(dream_id: int, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "Traum nicht gefunden")
    return to_out(dream)


@router.put("/dreams/{dream_id}", response_model=DreamOut)
def update_dream(dream_id: int, payload: DreamIn, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "Traum nicht gefunden")
    for key, value in payload.model_dump(exclude={"tags", "dream_signs"}).items():
        setattr(dream, key, value)
    apply_tags(session, dream, payload)
    session.add(dream)
    session.commit()
    session.refresh(dream)
    return to_out(dream)


@router.delete("/dreams/{dream_id}", status_code=204)
def delete_dream(dream_id: int, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "Traum nicht gefunden")
    dream.tags = []
    session.delete(dream)
    session.commit()


# ---------- Tags ----------

@router.get("/tags")
def list_tags(session: Session = Depends(get_session)):
    tags = session.exec(select(Tag)).all()
    return [
        {"id": t.id, "name": t.name, "kind": t.kind, "category": t.category, "count": len(t.dreams)}
        for t in sorted(tags, key=lambda t: (-len(t.dreams), t.name))
    ]


class CategoryIn(BaseModel):
    category: str | None = PField(default=None, pattern="^(awareness|action|form|context)$")


@router.put("/tags/{tag_id}/category")
def set_tag_category(tag_id: int, payload: CategoryIn, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404, "Tag nicht gefunden")
    if tag.kind != "dream_sign":
        raise HTTPException(400, "Nur Traumzeichen haben eine Kompass-Kategorie")
    tag.category = payload.category
    session.add(tag)
    session.commit()
    return {"id": tag.id, "name": tag.name, "category": tag.category}


# ---------- Statistik ----------

@router.get("/stats")
def stats(session: Session = Depends(get_session)):
    dreams = session.exec(select(Dream)).all()
    total = len(dreams)
    remembered = [d for d in dreams if d.lucidity >= 1]
    lucid = [d for d in dreams if d.lucidity >= 3]

    # Klartraum-Quote pro Kalenderwoche (letzte 12 Wochen mit Einträgen)
    weeks: dict[str, dict[str, int]] = {}
    for d in dreams:
        iso = d.date.isocalendar()
        key = f"{iso.year}-KW{iso.week:02d}"
        entry = weeks.setdefault(key, {"total": 0, "lucid": 0})
        entry["total"] += 1
        if d.lucidity >= 3:
            entry["lucid"] += 1
    per_week = [
        {"week": k, **v} for k, v in sorted(weeks.items())
    ][-12:]

    # Top-Traumzeichen
    sign_counter: Counter[str] = Counter()
    for d in dreams:
        for t in d.tags:
            if t.kind == "dream_sign":
                sign_counter[t.name] += 1
    top_signs = [
        {"name": name, "count": count}
        for name, count in sign_counter.most_common(10)
    ]

    # Traumkompass: Traumzeichen-Vorkommen je LaBerge-Kategorie
    compass = {"awareness": 0, "action": 0, "form": 0, "context": 0, "uncategorized": 0}
    for d in dreams:
        for t in d.tags:
            if t.kind == "dream_sign":
                compass[t.category if t.category in compass else "uncategorized"] += 1

    # Fokus-Zeichen: häufigstes Traumzeichen der letzten 14 Tage
    cutoff = dt.date.today() - dt.timedelta(days=14)
    recent_counter: Counter[str] = Counter()
    for d in dreams:
        if d.date >= cutoff:
            for t in d.tags:
                if t.kind == "dream_sign":
                    recent_counter[t.name] += 1
    focus = recent_counter.most_common(1)
    focus_sign = {"name": focus[0][0], "count": focus[0][1]} if focus else None

    # Beifuß-Experiment: Klartraum-Quote mit vs. ohne
    def lucid_rate(group: list[Dream]) -> float | None:
        if not group:
            return None
        return round(sum(1 for d in group if d.lucidity >= 3) / len(group) * 100, 1)

    with_beifuss = [d for d in dreams if d.beifuss]
    without_beifuss = [d for d in dreams if not d.beifuss]

    # Streak: an wie vielen Tagen in Folge (bis heute/gestern) wurde eingetragen?
    days = {d.date for d in dreams}
    streak = 0
    cursor = dt.date.today()
    if cursor not in days:
        cursor -= dt.timedelta(days=1)
    while cursor in days:
        streak += 1
        cursor -= dt.timedelta(days=1)

    return {
        "total": total,
        "remembered": len(remembered),
        "lucid": len(lucid),
        "lucid_rate": round(len(lucid) / total * 100, 1) if total else 0.0,
        "streak": streak,
        "per_week": per_week,
        "top_dream_signs": top_signs,
        "lucidity_distribution": [
            sum(1 for d in dreams if d.lucidity == level) for level in range(5)
        ],
        "compass": compass,
        "focus_sign": focus_sign,
        "beifuss": {
            "with": {"count": len(with_beifuss), "lucid_rate": lucid_rate(with_beifuss)},
            "without": {"count": len(without_beifuss), "lucid_rate": lucid_rate(without_beifuss)},
        },
    }


app.include_router(router)

# Frontend zuletzt mounten, damit /api/* Vorrang hat
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
