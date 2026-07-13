"""S.3: Traumatlas (Netzwerk-Ansicht), Umzugsarbeit aus main.py."""
import datetime as dt
from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from deps import get_session, require_auth
from models import Dream

router = APIRouter(prefix="/api", dependencies=[Depends(require_auth)])

ATLAS_KINDS = {"place", "person", "dream_sign"}


@router.get("/atlas")
def atlas(
    date_from: dt.date | None = Query(default=None, alias="from"),
    date_to: dt.date | None = Query(default=None, alias="to"),
    min_count: int = Query(default=1, ge=1),
    session: Session = Depends(get_session),
):
    """Knoten = wiederkehrende Orte/Personen/Traumzeichen,
    Verbindungen = gemeinsames Auftreten im selben Traum.
    `to` erlaubt den Atlas-Zeitraffer (B.5): zählt nur, was bis dahin geträumt wurde."""
    stmt = select(Dream)
    if date_from:
        stmt = stmt.where(Dream.date >= date_from)
    if date_to:
        stmt = stmt.where(Dream.date <= date_to)
    dreams = session.exec(stmt).all()
    node_counter: Counter[tuple[str, str]] = Counter()
    link_counter: Counter[tuple[tuple[str, str], tuple[str, str]]] = Counter()

    for d in dreams:
        elements = sorted({(t.name, t.kind) for t in d.tags if t.kind in ATLAS_KINDS})
        for e in elements:
            node_counter[e] += 1
        for i in range(len(elements)):
            for j in range(i + 1, len(elements)):
                link_counter[(elements[i], elements[j])] += 1

    node_counter = Counter({k: v for k, v in node_counter.items() if v >= min_count})
    kept = set(node_counter)

    return {
        "nodes": [
            {"id": f"{kind}:{name}", "name": name, "kind": kind, "count": count}
            for (name, kind), count in node_counter.items()
        ],
        "links": [
            {"source": f"{k1}:{n1}", "target": f"{k2}:{n2}", "weight": weight}
            for ((n1, k1), (n2, k2)), weight in link_counter.items()
            if (n1, k1) in kept and (n2, k2) in kept
        ],
    }
