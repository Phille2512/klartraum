"""S.3: Statistik + Mandala, Umzugsarbeit aus main.py (Berechnungen in stats_helpers.py)."""
import datetime as dt
from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from deps import get_session, require_auth
from helpers import has_substance
from models import Dream, Intention, Night
from stats_helpers import (
    build_connections,
    build_emotions_analysis,
    build_per_bucket,
    build_sleep_analysis,
    build_writing,
    split_groups,
)

router = APIRouter(prefix="/api", dependencies=[Depends(require_auth)])


@router.get("/stats/connections")
def stats_connections(
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
    return build_connections(dreams)


@router.get("/stats")
def stats(
    date_from: dt.date | None = Query(default=None, alias="from"),
    date_to: dt.date | None = Query(default=None, alias="to"),
    granularity: str = Query(default="week", pattern="^(day|week|month)$"),
    split: str | None = Query(default=None, pattern="^(beifuss|weekend|big_dream|sleep)$"),
    session: Session = Depends(get_session),
):
    stmt = select(Dream)
    if date_from:
        stmt = stmt.where(Dream.date >= date_from)
    if date_to:
        stmt = stmt.where(Dream.date <= date_to)
    dreams = session.exec(stmt).all()
    total = len(dreams)
    remembered = [d for d in dreams if d.lucidity >= 1]
    lucid = [d for d in dreams if d.lucidity >= 3]

    # N.3: Nächte und die Terzil-Karte immer komplett (nicht datumsgefiltert) —
    # "dein Median"/"deine Terzile" sind eine stabile persönliche Referenz, die
    # nicht mit dem Analyse-Zeitraum wandern soll.
    all_nights = session.exec(select(Night)).all()
    all_dreams = session.exec(select(Dream)).all()
    sleep_analysis = build_sleep_analysis(all_dreams, all_nights)

    per_bucket = build_per_bucket(dreams, granularity)

    split_data = None
    groups = split_groups(dreams, split, all_nights)
    if groups:
        label_a, label_b, group_a, group_b = groups
        split_data = {
            "kind": split,
            "label_a": label_a,
            "label_b": label_b,
            "n_a": len(group_a),
            "n_b": len(group_b),
            "per_bucket_a": build_per_bucket(group_a, granularity),
            "per_bucket_b": build_per_bucket(group_b, granularity),
            "writing_a": build_writing(group_a, granularity),
            "writing_b": build_writing(group_b, granularity),
            "emotions_analysis_a": build_emotions_analysis(group_a, granularity),
            "emotions_analysis_b": build_emotions_analysis(group_b, granularity),
        }

    writing = build_writing(dreams, granularity)

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

    # Wort-Neuheiten: Zeichen/Orte/Personen/Tags, die zum ersten Mal überhaupt
    # auftauchen — unabhängig vom gewählten Zeitraum-Filter der Seite, sonst
    # würde ein enger Filter ältere Elemente fälschlich als "neu" zeigen.
    all_dreams = session.exec(select(Dream)).all()
    first_seen: dict[tuple[str, str], dt.date] = {}
    for d in sorted(all_dreams, key=lambda x: x.date):
        for t in d.tags:
            if t.kind in ("dream_sign", "place", "person", "tag"):
                key = (t.kind, t.name)
                if key not in first_seen:
                    first_seen[key] = d.date
    new_cutoff = dt.date.today() - dt.timedelta(days=30)
    new_elements = sorted(
        (
            {"kind": kind, "name": name, "first_seen": date.isoformat()}
            for (kind, name), date in first_seen.items()
            if date >= new_cutoff
        ),
        key=lambda x: x["first_seen"],
        reverse=True,
    )[:15]

    # Beifuß-Experiment: Klartraum-Quote mit vs. ohne
    def lucid_rate(group: list[Dream]) -> float | None:
        if not group:
            return None
        return round(sum(1 for d in group if d.lucidity >= 3) / len(group) * 100, 1)

    with_beifuss = [d for d in dreams if has_substance(d, "beifuss")]
    without_beifuss = [d for d in dreams if not has_substance(d, "beifuss")]

    # Streak: an wie vielen Tagen in Folge (bis heute/gestern) wurde eingetragen?
    days = {d.date for d in dreams}
    streak = 0
    cursor = dt.date.today()
    if cursor not in days:
        cursor -= dt.timedelta(days=1)
    while cursor in days:
        streak += 1
        cursor -= dt.timedelta(days=1)

    # Emotionen (A.5)
    emotions_analysis = build_emotions_analysis(dreams, granularity)

    # Wochentag/Schlafqualität-Korrelationen
    weekday_counter: dict[int, dict[str, int]] = {i: {"total": 0, "lucid": 0} for i in range(7)}
    sq_lucid: dict[int, dict[str, int]] = {i: {"total": 0, "lucid": 0} for i in range(1, 6)}
    for d in dreams:
        wd = d.date.weekday()
        weekday_counter[wd]["total"] += 1
        if d.lucidity >= 3:
            weekday_counter[wd]["lucid"] += 1
        if d.sleep_quality:
            sq_lucid[d.sleep_quality]["total"] += 1
            if d.lucidity >= 3:
                sq_lucid[d.sleep_quality]["lucid"] += 1

    weekday_names = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
    correlations = {
        "weekday": [
            {"day": weekday_names[i], "total": weekday_counter[i]["total"], "lucid": weekday_counter[i]["lucid"]}
            for i in range(7)
        ],
        "sleep_quality": [
            {"quality": q, "total": sq_lucid[q]["total"], "lucid": sq_lucid[q]["lucid"]}
            for q in range(1, 6)
        ],
    }

    # Phänomen-Tracking (falsches Erwachen, Schlafparalyse, Traum-im-Traum, ...)
    phenomena_counts = {
        "falsches_erwachen": sum(1 for d in dreams if d.falsches_erwachen),
        "schlafparalyse": sum(1 for d in dreams if d.schlafparalyse),
        "traum_im_traum": sum(1 for d in dreams if d.traum_im_traum),
        "wiederkehrend": sum(1 for d in dreams if d.wiederkehrend),
        "albtraum": sum(1 for d in dreams if d.albtraum),
    }
    phenomena_hints = []
    if phenomena_counts["falsches_erwachen"] >= 2:
        phenomena_hints.append(
            "Mehrere falsche Erwachen — das sind ideale Reality-Check-Momente: "
            "übe, direkt nach dem Aufwachen einen Reality-Check zu machen, auch wenn es sich echt anfühlt."
        )
    if phenomena_counts["traum_im_traum"] >= 1:
        phenomena_hints.append(
            "Traum-im-Traum-Momente sind ein starkes Klarheitssignal — achte beim nächsten Mal "
            "direkt in diesem Moment auf Ungereimtheiten (DILD-Chance)."
        )
    if phenomena_counts["wiederkehrend"] >= 2:
        phenomena_hints.append(
            "Wiederkehrende Träume eignen sich gut als persönliches Traumzeichen — "
            "trage sie als Zeichen ein, um sie im Traumatlas zu verfolgen."
        )

    # Inkubations-Quote
    all_intentions = session.exec(select(Intention)).all()
    closed = [i for i in all_intentions if i.fulfilled is not None]
    fulfilled_count = sum(1 for i in closed if i.fulfilled)
    incubation = {
        "total": len(closed),
        "fulfilled": fulfilled_count,
        "rate": round(fulfilled_count / len(closed) * 100, 1) if closed else 0.0,
    }

    return {
        "total": total,
        "remembered": len(remembered),
        "lucid": len(lucid),
        "lucid_rate": round(len(lucid) / total * 100, 1) if total else 0.0,
        "streak": streak,
        "granularity": granularity,
        "per_bucket": per_bucket,
        "split": split_data,
        "writing": writing,
        "top_dream_signs": top_signs,
        "new_elements": new_elements,
        "lucidity_distribution": [
            sum(1 for d in dreams if d.lucidity == level) for level in range(5)
        ],
        "compass": compass,
        "focus_sign": focus_sign,
        "beifuss": {
            "with": {"count": len(with_beifuss), "lucid_rate": lucid_rate(with_beifuss)},
            "without": {"count": len(without_beifuss), "lucid_rate": lucid_rate(without_beifuss)},
        },
        "incubation": incubation,
        "phenomena": {"counts": phenomena_counts, "hints": phenomena_hints},
        "emotions_analysis": emotions_analysis,
        "correlations": correlations,
        "sleep": sleep_analysis,
    }


@router.get("/mandala")
def mandala(
    date_from: dt.date | None = Query(default=None, alias="from"),
    date_to: dt.date | None = Query(default=None, alias="to"),
    session: Session = Depends(get_session),
):
    stmt = select(Dream).order_by(Dream.date)
    if date_from:
        stmt = stmt.where(Dream.date >= date_from)
    if date_to:
        stmt = stmt.where(Dream.date <= date_to)
    dreams = session.exec(stmt).all()

    emotion_totals: Counter[str] = Counter()
    element_counter: Counter[tuple[str, str]] = Counter()
    dream_data = []
    for d in dreams:
        emos = [e.strip() for e in (d.emotions or "").split(",") if e.strip()]
        for e in emos:
            emotion_totals[e] += 1
        for t in d.tags:
            if t.kind in ("place", "person", "dream_sign"):
                element_counter[(t.name, t.kind)] += 1
        dream_data.append({
            "date": d.date.isoformat(),
            "lucidity": d.lucidity,
            "big_dream": d.big_dream,
            "emotions": emos,
        })

    top_elements = [
        {"name": name, "kind": kind, "count": count}
        for (name, kind), count in element_counter.most_common(12)
    ]

    return {
        "days": len({d.date for d in dreams}),
        "dreams": dream_data,
        "top_elements": top_elements,
        "emotion_totals": dict(emotion_totals),
    }
