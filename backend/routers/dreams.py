"""S.3: Traum-CRUD + Echos, Umzugsarbeit aus main.py."""
import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, col, select

from deps import get_session, require_auth
from helpers import apply_tags, to_out
from models import Dream, DreamTag, Tag
from schemas import DreamIn, DreamOut

router = APIRouter(prefix="/api", dependencies=[Depends(require_auth)])


@router.get("/dreams", response_model=list[DreamOut])
def list_dreams(
    search: str | None = None,
    tag: str | None = None,
    date_from: dt.date | None = Query(default=None, alias="from"),
    date_to: dt.date | None = Query(default=None, alias="to"),
    big_dream: bool | None = None,
    emotion: str | None = None,
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
    if big_dream is not None:
        stmt = stmt.where(Dream.big_dream == big_dream)
    if tag:
        stmt = stmt.join(DreamTag, col(DreamTag.dream_id) == col(Dream.id)).join(
            Tag, col(Tag.id) == col(DreamTag.tag_id)
        ).where(Tag.name == tag.strip().lower())
    dreams = session.exec(stmt).unique().all()
    if emotion:
        # emotions ist eine kommagetrennte Spalte (siehe helpers.to_out) — Filterung
        # in Python statt fragilem SQL-LIKE, um Teilstring-Kollisionen zu vermeiden
        # (z. B. "angst" als Teilstring eines anderen Schlüssels).
        dreams = [
            d for d in dreams
            if emotion in {e.strip() for e in (d.emotions or "").split(",") if e.strip()}
        ]
    return [to_out(d) for d in dreams]


@router.post("/dreams", response_model=DreamOut, status_code=201)
def create_dream(payload: DreamIn, session: Session = Depends(get_session)):
    data = payload.model_dump(exclude={"tags", "dream_signs", "places", "persons", "emotions", "substances"})
    data["emotions"] = ",".join(payload.emotions) if payload.emotions else None
    data["substances"] = ",".join(payload.substances) if payload.substances else None
    dream = Dream(**data)
    apply_tags(session, dream, payload)
    session.add(dream)
    session.commit()
    session.refresh(dream)
    return to_out(dream)


# WICHTIG (Routen-Reihenfolge, historischer Regressionsfall): dieser statische
# Pfad MUSS vor "/dreams/{dream_id}" registriert werden, sonst interpretiert
# FastAPI "echoes" als {dream_id} und liefert 422 statt 200.
@router.get("/dreams/echoes")
def dream_echoes(text: str = Query(min_length=10), exclude_id: int | None = None, session: Session = Depends(get_session)):
    if not text.strip():
        return []
    words = set(text.lower().split())
    dreams = session.exec(select(Dream)).all()
    scored = []
    for d in dreams:
        if d.id == exclude_id:
            continue
        dream_words = set(d.content.lower().split()) | set(d.title.lower().split())
        overlap = len(words & dream_words)
        if overlap >= 3:
            scored.append((overlap / max(len(words), 1), d))
    scored.sort(key=lambda x: -x[0])
    return [
        {"id": d.id, "title": d.title, "date": d.date.isoformat(), "score": round(s, 2),
         "lucidity": d.lucidity}
        for s, d in scored[:3]
    ]


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
    for key, value in payload.model_dump(exclude={"tags", "dream_signs", "places", "persons", "emotions", "substances"}).items():
        setattr(dream, key, value)
    dream.emotions = ",".join(payload.emotions) if payload.emotions else None
    dream.substances = ",".join(payload.substances) if payload.substances else None
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
