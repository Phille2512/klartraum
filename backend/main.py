import datetime as dt
from collections import Counter
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field as PField
from sqlmodel import Session, col, select

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


# ---------- Schemas (API-Eingabe/-Ausgabe) ----------

class DreamIn(BaseModel):
    date: dt.date
    title: str
    content: str = ""
    lucidity: int = PField(default=2, ge=0, le=4)
    sleep_quality: int | None = PField(default=None, ge=1, le=5)
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

@app.get("/api/dreams", response_model=list[DreamOut])
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


@app.post("/api/dreams", response_model=DreamOut, status_code=201)
def create_dream(payload: DreamIn, session: Session = Depends(get_session)):
    dream = Dream(**payload.model_dump(exclude={"tags", "dream_signs"}))
    apply_tags(session, dream, payload)
    session.add(dream)
    session.commit()
    session.refresh(dream)
    return to_out(dream)


@app.get("/api/dreams/{dream_id}", response_model=DreamOut)
def get_dream(dream_id: int, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "Traum nicht gefunden")
    return to_out(dream)


@app.put("/api/dreams/{dream_id}", response_model=DreamOut)
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


@app.delete("/api/dreams/{dream_id}", status_code=204)
def delete_dream(dream_id: int, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "Traum nicht gefunden")
    dream.tags = []
    session.delete(dream)
    session.commit()


# ---------- Tags ----------

@app.get("/api/tags")
def list_tags(session: Session = Depends(get_session)):
    tags = session.exec(select(Tag)).all()
    return [
        {"name": t.name, "kind": t.kind, "count": len(t.dreams)}
        for t in sorted(tags, key=lambda t: (-len(t.dreams), t.name))
    ]


# ---------- Statistik ----------

@app.get("/api/stats")
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
    }


# Frontend zuletzt mounten, damit /api/* Vorrang hat
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
