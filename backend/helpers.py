"""S.3: Dream/Tag-Helfer, reine Umzugsarbeit aus main.py.

WICHTIG (Konvention Nr. 3 aus UMSETZUNGSPLAN.md Teil A): tags/dream_signs/
places/persons existieren nicht am Dream-Modell und müssen bei model_dump
ausgeklammert werden — sonst 500er. apply_tags() übernimmt das."""
from sqlmodel import Session, select

from models import Dream, Tag
from schemas import DreamIn, DreamOut


def to_out(dream: Dream) -> DreamOut:
    return DreamOut(
        id=dream.id,
        date=dream.date,
        title=dream.title,
        content=dream.content,
        lucidity=dream.lucidity,
        sleep_quality=dream.sleep_quality,
        substances=[s.strip() for s in (dream.substances or "").split(",") if s.strip()],
        substance_other=dream.substance_other,
        big_dream=dream.big_dream,
        falsches_erwachen=dream.falsches_erwachen,
        schlafparalyse=dream.schlafparalyse,
        traum_im_traum=dream.traum_im_traum,
        wiederkehrend=dream.wiederkehrend,
        albtraum=dream.albtraum,
        emotions=[e.strip() for e in (dream.emotions or "").split(",") if e.strip()],
        notes_analysis=dream.notes_analysis,
        tags=sorted(t.name for t in dream.tags if t.kind == "tag"),
        dream_signs=sorted(t.name for t in dream.tags if t.kind == "dream_sign"),
        places=sorted(t.name for t in dream.tags if t.kind == "place"),
        persons=sorted(t.name for t in dream.tags if t.kind == "person"),
    )


def has_substance(dream: Dream, key: str) -> bool:
    return key in {s.strip() for s in (dream.substances or "").split(",") if s.strip()}


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
    groups = [
        ("tag", payload.tags),
        ("dream_sign", payload.dream_signs),
        ("place", payload.places),
        ("person", payload.persons),
    ]
    dream.tags = [
        get_or_create_tag(session, name, kind)
        for kind, names in groups
        for name in names
        if name.strip()
    ]
