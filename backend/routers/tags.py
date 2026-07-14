"""S.3: Tags (Kategorie, Archetyp, Region) + Symbol-Notizen, Umzugsarbeit aus main.py."""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from deps import get_session, require_auth
from models import MapRegion, SymbolNote, Tag
from schemas import ArchetypeIn, CategoryIn, SymbolNoteIn, TagRegionIn

router = APIRouter(prefix="/api", dependencies=[Depends(require_auth)])

VALID_ARCHETYPES = {"schatten", "anima_animus", "weiser", "kind", "trickster", "held", "grosse_mutter", "persona"}


@router.get("/tags")
def list_tags(session: Session = Depends(get_session)):
    tags = session.exec(select(Tag)).all()
    return [
        {"id": t.id, "name": t.name, "kind": t.kind, "category": t.category, "archetype": t.archetype, "count": len(t.dreams)}
        for t in sorted(tags, key=lambda t: (-len(t.dreams), t.name))
    ]


@router.put("/tags/{tag_id}/category")
def set_tag_category(tag_id: int, payload: CategoryIn, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404, "tag_not_found")
    if tag.kind != "dream_sign":
        raise HTTPException(400, "only_dream_signs_have_category")
    tag.category = payload.category
    session.add(tag)
    session.commit()
    return {"id": tag.id, "name": tag.name, "category": tag.category}


@router.put("/tags/{tag_id}/archetype")
def set_tag_archetype(tag_id: int, payload: ArchetypeIn, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404, "tag_not_found")
    if tag.kind != "person":
        raise HTTPException(400, "only_persons_have_archetype")
    if payload.archetype and payload.archetype not in VALID_ARCHETYPES:
        raise HTTPException(422, "unknown_archetype")
    tag.archetype = payload.archetype
    session.add(tag)
    session.commit()
    return {"id": tag.id, "name": tag.name, "archetype": tag.archetype}


@router.put("/tags/{tag_id}/region")
def set_tag_region(tag_id: int, payload: TagRegionIn, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404, "tag_not_found")
    if payload.region_id is not None and not session.get(MapRegion, payload.region_id):
        raise HTTPException(404, "region_not_found")
    tag.region_id = payload.region_id
    session.add(tag)
    session.commit()
    return {"id": tag.id, "region_id": tag.region_id}


@router.get("/tags/{tag_id}/notes")
def list_symbol_notes(tag_id: int, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404, "tag_not_found")
    notes = session.exec(
        select(SymbolNote).where(SymbolNote.tag_id == tag_id).order_by(SymbolNote.created_at)
    ).all()
    return [{"id": n.id, "text": n.text, "created_at": n.created_at.isoformat()} for n in notes]


@router.post("/tags/{tag_id}/notes", status_code=201)
def create_symbol_note(tag_id: int, payload: SymbolNoteIn, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404, "tag_not_found")
    if tag.kind not in ("dream_sign", "place", "person"):
        raise HTTPException(400, "associations_not_supported")
    note = SymbolNote(tag_id=tag_id, text=payload.text.strip())
    session.add(note)
    session.commit()
    session.refresh(note)
    return {"id": note.id, "text": note.text, "created_at": note.created_at.isoformat()}


@router.delete("/symbol-notes/{note_id}", status_code=204)
def delete_symbol_note(note_id: int, session: Session = Depends(get_session)):
    note = session.get(SymbolNote, note_id)
    if not note:
        raise HTTPException(404, "note_not_found")
    session.delete(note)
    session.commit()
