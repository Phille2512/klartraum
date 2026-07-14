"""S.3: Innenwelt (Jung) — Reflexionen, Imaginationen, Traum-Analyse,
Synchronizitäts-Journal, Umzugsarbeit aus main.py."""
import datetime as dt
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, col, select

from deps import get_session, require_auth
from models import DreamAnalysis, Dream, Imagination, Reflection, SyncEvent, Tag
from schemas import DreamAnalysisIn, ImaginationIn, ReflectionIn, SyncEventIn

router = APIRouter(prefix="/api", dependencies=[Depends(require_auth)])

ANALYSIS_STATIONS = {"persona", "schatten", "gegenstimme", "kompensation", "symbole", "ganzheit"}


@router.get("/innenwelt")
def innenwelt(
    date_from: dt.date | None = Query(default=None, alias="from"),
    date_to: dt.date | None = Query(default=None, alias="to"),
    session: Session = Depends(get_session),
):
    stmt = select(Dream)
    if date_from:
        stmt = stmt.where(Dream.date >= date_from)
    if date_to:
        stmt = stmt.where(Dream.date <= date_to)
    dreams = session.exec(stmt).all()
    person_tags = session.exec(select(Tag).where(Tag.kind == "person")).all()

    result = []
    for tag in person_tags:
        tag_dreams = [d for d in dreams if tag in d.tags]
        if not tag_dreams:
            continue
        emo_counts: Counter[str] = Counter()
        for d in tag_dreams:
            for e in (e.strip() for e in (d.emotions or "").split(",") if e.strip()):
                emo_counts[e] += 1
        has_imgs = any(
            session.exec(select(Imagination).where(Imagination.dream_id == d.id)).first()
            for d in tag_dreams
        )
        result.append({
            "tag_id": tag.id,
            "name": tag.name,
            "archetype": tag.archetype,
            "count": len(tag_dreams),
            "last_date": max(d.date for d in tag_dreams).isoformat(),
            "emotions": dict(emo_counts),
            "has_imaginations": has_imgs,
        })
    return result


@router.get("/dreams/{dream_id}/reflections")
def list_reflections(dream_id: int, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "dream_not_found")
    refs = session.exec(
        select(Reflection).where(Reflection.dream_id == dream_id).order_by(Reflection.created_at)
    ).all()
    return [{"id": r.id, "question": r.question, "answer": r.answer, "created_at": r.created_at.isoformat()} for r in refs]


@router.post("/dreams/{dream_id}/reflections", status_code=201)
def create_reflection(dream_id: int, payload: ReflectionIn, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "dream_not_found")
    ref = Reflection(dream_id=dream_id, question=payload.question, answer=payload.answer)
    session.add(ref)
    session.commit()
    session.refresh(ref)
    return {"id": ref.id, "question": ref.question, "answer": ref.answer, "created_at": ref.created_at.isoformat()}


@router.delete("/reflections/{ref_id}", status_code=204)
def delete_reflection(ref_id: int, session: Session = Depends(get_session)):
    ref = session.get(Reflection, ref_id)
    if not ref:
        raise HTTPException(404, "reflection_not_found")
    session.delete(ref)
    session.commit()


@router.get("/dreams/{dream_id}/imaginations")
def list_imaginations(dream_id: int, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "dream_not_found")
    imgs = session.exec(
        select(Imagination).where(Imagination.dream_id == dream_id).order_by(Imagination.created_at)
    ).all()
    return [{"id": i.id, "text": i.text, "created_at": i.created_at.isoformat()} for i in imgs]


@router.post("/dreams/{dream_id}/imaginations", status_code=201)
def create_imagination(dream_id: int, payload: ImaginationIn, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "dream_not_found")
    img = Imagination(dream_id=dream_id, text=payload.text.strip())
    session.add(img)
    session.commit()
    session.refresh(img)
    return {"id": img.id, "text": img.text, "created_at": img.created_at.isoformat()}


@router.delete("/imaginations/{img_id}", status_code=204)
def delete_imagination(img_id: int, session: Session = Depends(get_session)):
    img = session.get(Imagination, img_id)
    if not img:
        raise HTTPException(404, "imagination_not_found")
    session.delete(img)
    session.commit()


# Hinweis (T.2): Die allgemeine Individuationsreise (/api/journey*) wurde aus
# der Oberfläche entfernt — die Traumebenen-Variante (DreamAnalysis unten)
# hat sich bewährt. Tabelle `journeystep` bleibt in models.py bestehen
# (kein DROP), falls die Idee zurückkommt.

@router.get("/dreams/{dream_id}/analysis")
def list_dream_analysis(dream_id: int, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "dream_not_found")
    entries = session.exec(
        select(DreamAnalysis).where(DreamAnalysis.dream_id == dream_id).order_by(DreamAnalysis.created_at)
    ).all()
    return [{"id": e.id, "station": e.station, "answer": e.answer, "created_at": e.created_at.isoformat()} for e in entries]


@router.post("/dreams/{dream_id}/analysis", status_code=201)
def create_dream_analysis(dream_id: int, payload: DreamAnalysisIn, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "dream_not_found")
    if payload.station not in ANALYSIS_STATIONS:
        raise HTTPException(422, "unknown_station")
    existing = session.exec(
        select(DreamAnalysis).where(DreamAnalysis.dream_id == dream_id, DreamAnalysis.station == payload.station)
    ).first()
    if existing:
        existing.answer = payload.answer
        existing.created_at = dt.datetime.utcnow()
        session.add(existing)
        session.commit()
        return {"id": existing.id, "station": existing.station, "answer": existing.answer, "created_at": existing.created_at.isoformat()}
    entry = DreamAnalysis(dream_id=dream_id, station=payload.station, answer=payload.answer)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return {"id": entry.id, "station": entry.station, "answer": entry.answer, "created_at": entry.created_at.isoformat()}


@router.delete("/dream-analysis/{entry_id}", status_code=204)
def delete_dream_analysis(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(DreamAnalysis, entry_id)
    if not entry:
        raise HTTPException(404, "analysis_not_found")
    session.delete(entry)
    session.commit()


@router.get("/sync-events")
def list_sync_events(session: Session = Depends(get_session)):
    events = session.exec(select(SyncEvent).order_by(col(SyncEvent.date).desc())).all()
    return [
        {
            "id": e.id,
            "dream_id": e.dream_id,
            "date": e.date.isoformat(),
            "text": e.text,
            "created_at": e.created_at.isoformat(),
        }
        for e in events
    ]


@router.post("/sync-events", status_code=201)
def create_sync_event(payload: SyncEventIn, session: Session = Depends(get_session)):
    if payload.dream_id:
        dream = session.get(Dream, payload.dream_id)
        if not dream:
            raise HTTPException(404, "dream_not_found")
    event = SyncEvent(dream_id=payload.dream_id, date=payload.date, text=payload.text.strip())
    session.add(event)
    session.commit()
    session.refresh(event)
    return {"id": event.id, "dream_id": event.dream_id, "date": event.date.isoformat(), "text": event.text, "created_at": event.created_at.isoformat()}


@router.delete("/sync-events/{event_id}", status_code=204)
def delete_sync_event(event_id: int, session: Session = Depends(get_session)):
    event = session.get(SyncEvent, event_id)
    if not event:
        raise HTTPException(404, "event_not_found")
    session.delete(event)
    session.commit()
