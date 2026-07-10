import csv
import datetime as dt
import io
import json
from collections import Counter
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field as PField
from sqlmodel import Session, col, select

import auth
from database import get_session, init_db
from models import Dream, DreamAnalysis, DreamTag, Goal, Imagination, Intention, JourneyStep, MapNode, MapPath, Reflection, SymbolNote, SyncEvent, Tag
from paths import DATA_DIR, FRONTEND_DIR


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
    big_dream: bool = False
    emotions: list[str] = []
    notes_analysis: str | None = None
    tags: list[str] = []
    dream_signs: list[str] = []
    places: list[str] = []
    persons: list[str] = []


class DreamOut(BaseModel):
    id: int
    date: dt.date
    title: str
    content: str
    lucidity: int
    sleep_quality: int | None
    beifuss: bool
    big_dream: bool
    emotions: list[str]
    notes_analysis: str | None
    tags: list[str]
    dream_signs: list[str]
    places: list[str]
    persons: list[str]


def to_out(dream: Dream) -> DreamOut:
    return DreamOut(
        id=dream.id,
        date=dream.date,
        title=dream.title,
        content=dream.content,
        lucidity=dream.lucidity,
        sleep_quality=dream.sleep_quality,
        beifuss=dream.beifuss,
        big_dream=dream.big_dream,
        emotions=[e.strip() for e in (dream.emotions or "").split(",") if e.strip()],
        notes_analysis=dream.notes_analysis,
        tags=sorted(t.name for t in dream.tags if t.kind == "tag"),
        dream_signs=sorted(t.name for t in dream.tags if t.kind == "dream_sign"),
        places=sorted(t.name for t in dream.tags if t.kind == "place"),
        persons=sorted(t.name for t in dream.tags if t.kind == "person"),
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
    data = payload.model_dump(exclude={"tags", "dream_signs", "places", "persons", "emotions"})
    data["emotions"] = ",".join(payload.emotions) if payload.emotions else None
    dream = Dream(**data)
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
    for key, value in payload.model_dump(exclude={"tags", "dream_signs", "places", "persons", "emotions"}).items():
        setattr(dream, key, value)
    dream.emotions = ",".join(payload.emotions) if payload.emotions else None
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
        {"id": t.id, "name": t.name, "kind": t.kind, "category": t.category, "archetype": t.archetype, "count": len(t.dreams)}
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


# ---------- Klartraum-Bucket-List ----------

class GoalIn(BaseModel):
    text: str = PField(min_length=1)


class GoalToggle(BaseModel):
    done: bool


@router.get("/goals")
def list_goals(session: Session = Depends(get_session)):
    goals = session.exec(select(Goal)).all()
    open_goals = sorted([g for g in goals if not g.done], key=lambda g: g.created_at)
    done_goals = sorted([g for g in goals if g.done], key=lambda g: g.done_at or g.created_at, reverse=True)
    return [
        {"id": g.id, "text": g.text, "done": g.done, "done_at": g.done_at.isoformat() if g.done_at else None}
        for g in open_goals + done_goals
    ]


@router.post("/goals", status_code=201)
def create_goal(payload: GoalIn, session: Session = Depends(get_session)):
    goal = Goal(text=payload.text.strip())
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return {"id": goal.id, "text": goal.text, "done": goal.done, "done_at": None}


@router.patch("/goals/{goal_id}")
def update_goal(goal_id: int, payload: GoalToggle, session: Session = Depends(get_session)):
    goal = session.get(Goal, goal_id)
    if not goal:
        raise HTTPException(404, "Ziel nicht gefunden")
    goal.done = payload.done
    goal.done_at = dt.datetime.utcnow() if payload.done else None
    session.add(goal)
    session.commit()
    return {"id": goal.id, "text": goal.text, "done": goal.done, "done_at": goal.done_at.isoformat() if goal.done_at else None}


@router.delete("/goals/{goal_id}", status_code=204)
def delete_goal(goal_id: int, session: Session = Depends(get_session)):
    goal = session.get(Goal, goal_id)
    if not goal:
        raise HTTPException(404, "Ziel nicht gefunden")
    session.delete(goal)
    session.commit()


# ---------- Intentionen (Abendritual) ----------

class IntentionIn(BaseModel):
    text: str = PField(min_length=1)


class IntentionFulfill(BaseModel):
    fulfilled: bool


@router.get("/intentions/current")
def current_intention(session: Session = Depends(get_session)):
    stmt = select(Intention).where(Intention.fulfilled == None).order_by(col(Intention.id).desc())  # noqa: E711
    intention = session.exec(stmt).first()
    if not intention:
        return None
    return {
        "id": intention.id,
        "date": intention.date.isoformat(),
        "text": intention.text,
        "fulfilled": intention.fulfilled,
        "is_today": intention.date == dt.date.today(),
    }


@router.post("/intentions", status_code=201)
def create_intention(payload: IntentionIn, session: Session = Depends(get_session)):
    today = dt.date.today()
    existing = session.exec(
        select(Intention).where(Intention.date == today, Intention.fulfilled == None)  # noqa: E711
    ).first()
    if existing:
        existing.text = payload.text.strip()
        session.add(existing)
        session.commit()
        session.refresh(existing)
        intention = existing
    else:
        intention = Intention(date=today, text=payload.text.strip())
        session.add(intention)
        session.commit()
        session.refresh(intention)
    return {
        "id": intention.id,
        "date": intention.date.isoformat(),
        "text": intention.text,
        "fulfilled": intention.fulfilled,
    }


@router.patch("/intentions/{intention_id}")
def update_intention(intention_id: int, payload: IntentionFulfill, session: Session = Depends(get_session)):
    intention = session.get(Intention, intention_id)
    if not intention:
        raise HTTPException(404, "Intention nicht gefunden")
    intention.fulfilled = payload.fulfilled
    session.add(intention)
    session.commit()
    return {"id": intention.id, "fulfilled": intention.fulfilled}


# ---------- Statistik ----------

def bucket_key(d: dt.date, granularity: str) -> str:
    if granularity == "day":
        return d.isoformat()
    if granularity == "month":
        return f"{d.year}-{d.month:02d}"
    iso = d.isocalendar()
    return f"{iso.year}-KW{iso.week:02d}"


def build_per_bucket(dreams: list[Dream], granularity: str) -> list[dict]:
    buckets: dict[str, dict[str, int]] = {}
    for d in dreams:
        key = bucket_key(d.date, granularity)
        entry = buckets.setdefault(key, {"total": 0, "lucid": 0, "words": 0})
        entry["total"] += 1
        entry["words"] += len(d.content.split())
        if d.lucidity >= 3:
            entry["lucid"] += 1
    return [
        {
            "bucket": k,
            "total": v["total"],
            "lucid": v["lucid"],
            "words": v["words"],
            # Ø Wörter pro Eintrag: Maß fürs Erinnerungs-Training
            "avg_words": round(v["words"] / v["total"]),
        }
        for k, v in sorted(buckets.items())
    ]


def split_groups(dreams: list[Dream], split: str | None) -> tuple[str, str, list[Dream], list[Dream]] | None:
    if split == "beifuss":
        return "🌿 Mit Beifuß", "Ohne Beifuß", [d for d in dreams if d.beifuss], [d for d in dreams if not d.beifuss]
    if split == "weekend":
        return "Wochenende", "Werktag", [d for d in dreams if d.date.weekday() >= 5], [d for d in dreams if d.date.weekday() < 5]
    if split == "big_dream":
        return "⭐ Große Träume", "Andere Träume", [d for d in dreams if d.big_dream], [d for d in dreams if not d.big_dream]
    return None


def n_tagged(d: Dream) -> int:
    return sum(1 for t in d.tags if t.kind in ("dream_sign", "place", "person"))


def build_writing(dreams: list[Dream], granularity: str = "week") -> dict:
    if not dreams:
        return {
            "total_words": 0, "avg_words": 0, "median_words": 0, "longest": None,
            "trend": {"last7": 0, "prev7": 0, "delta_pct": None},
            "heatmap": [], "histogram": [], "detail_depth_per_bucket": [], "score_per_bucket": [],
        }
    word_counts = [len(d.content.split()) for d in dreams]
    total_words = sum(word_counts)
    avg_words = round(total_words / len(dreams), 1)
    sorted_wc = sorted(word_counts)
    n = len(sorted_wc)
    median_words = sorted_wc[n // 2] if n % 2 else round((sorted_wc[n // 2 - 1] + sorted_wc[n // 2]) / 2, 1)
    longest_dream = max(dreams, key=lambda d: len(d.content.split()))
    longest = {"id": longest_dream.id, "title": longest_dream.title, "words": len(longest_dream.content.split())}

    today = dt.date.today()
    last7 = [d for d in dreams if d.date > today - dt.timedelta(days=7)]
    prev7 = [d for d in dreams if today - dt.timedelta(days=14) < d.date <= today - dt.timedelta(days=7)]
    last7_words = sum(len(d.content.split()) for d in last7)
    prev7_words = sum(len(d.content.split()) for d in prev7)
    delta_pct = round((last7_words - prev7_words) / prev7_words * 100, 1) if prev7_words else None

    heatmap = [
        {"date": d.date.isoformat(), "words": len(d.content.split()), "title": d.title}
        for d in sorted(dreams, key=lambda d: d.date)
        if d.date >= today - dt.timedelta(days=182)
    ]

    hist_bounds = [(0, 0), (1, 25), (26, 50), (51, 100), (101, 200), (201, None)]
    hist_labels = ["0", "1–25", "26–50", "51–100", "101–200", "200+"]
    histogram = []
    for (lo, hi), label in zip(hist_bounds, hist_labels):
        count = sum(1 for w in word_counts if w >= lo) if hi is None else sum(1 for w in word_counts if lo <= w <= hi)
        histogram.append({"bucket": label, "count": count})

    # Detailtiefe: Ø Anzahl getaggter Elemente (Zeichen+Orte+Personen) pro Traum je Bucket
    detail_buckets: dict[str, list[int]] = {}
    for d in dreams:
        detail_buckets.setdefault(bucket_key(d.date, granularity), []).append(n_tagged(d))
    detail_depth_per_bucket = [
        {"bucket": k, "avg_detail": round(sum(v) / len(v), 2)}
        for k, v in sorted(detail_buckets.items())
    ]

    # Erinnerungs-Score je Bucket: 40% Wortzahl-Perzentil + 30% Detailtiefe-Perzentil + 30% Erinnerungsquote
    def percentile_rank(value: int, all_values: list[int]) -> float:
        if len(all_values) < 2:
            return 100.0
        return sum(1 for v in all_values if v <= value) / len(all_values) * 100

    score_buckets: dict[str, list[Dream]] = {}
    for d in dreams:
        score_buckets.setdefault(bucket_key(d.date, granularity), []).append(d)
    all_details = [n_tagged(d) for d in dreams]
    score_per_bucket = []
    for k, group in sorted(score_buckets.items()):
        w_pct = sum(percentile_rank(len(d.content.split()), word_counts) for d in group) / len(group)
        det_pct = sum(percentile_rank(n_tagged(d), all_details) for d in group) / len(group)
        recall_rate = sum(1 for d in group if d.lucidity >= 1) / len(group) * 100
        score_per_bucket.append({"bucket": k, "score": round(0.4 * w_pct + 0.3 * det_pct + 0.3 * recall_rate, 1)})

    return {
        "total_words": total_words,
        "avg_words": avg_words,
        "median_words": median_words,
        "longest": longest,
        "trend": {"last7": last7_words, "prev7": prev7_words, "delta_pct": delta_pct},
        "heatmap": heatmap,
        "histogram": histogram,
        "detail_depth_per_bucket": detail_depth_per_bucket,
        "score_per_bucket": score_per_bucket,
    }


# Valenz-Konstante für die Emotions-Analyse (A.5) — im Frontend per 💡 offengelegt
EMOTION_VALENCE = {
    "freude": "positiv", "liebe": "positiv", "frieden": "positiv",
    "staunen": "positiv", "neugier": "positiv", "sehnsucht": "positiv",
    "angst": "negativ", "trauer": "negativ", "wut": "negativ",
    "ekel": "negativ", "scham": "negativ",
    "verwirrung": "neutral",
}


def build_emotions_analysis(dreams: list[Dream], granularity: str) -> dict:
    emotion_counter: Counter[str] = Counter()
    emotion_lucid: Counter[str] = Counter()
    emotion_place: dict[str, Counter[str]] = {}
    emotion_person: dict[str, Counter[str]] = {}
    emotion_time: dict[str, Counter[str]] = {}
    pair_counter: Counter[tuple[str, str]] = Counter()

    for d in dreams:
        emos = sorted({e.strip() for e in (d.emotions or "").split(",") if e.strip()})
        key = bucket_key(d.date, granularity)
        time_bucket = emotion_time.setdefault(key, Counter())
        for e in emos:
            emotion_counter[e] += 1
            time_bucket[e] += 1
            if d.lucidity >= 3:
                emotion_lucid[e] += 1
            for t in d.tags:
                if t.kind == "place":
                    emotion_place.setdefault(e, Counter())[t.name] += 1
                if t.kind == "person":
                    emotion_person.setdefault(e, Counter())[t.name] += 1
        for i in range(len(emos)):
            for j in range(i + 1, len(emos)):
                pair_counter[(emos[i], emos[j])] += 1

    top6 = [e for e, _ in emotion_counter.most_common(6)]
    over_time = []
    for k in sorted(emotion_time):
        ctr = emotion_time[k]
        row = {"bucket": k, **{e: ctr.get(e, 0) for e in top6}}
        row["andere"] = sum(c for e, c in ctr.items() if e not in top6)
        over_time.append(row)

    valence_over_time = []
    for k in sorted(emotion_time):
        ctr = emotion_time[k]
        n = sum(ctr.values())
        pos = sum(c for e, c in ctr.items() if EMOTION_VALENCE.get(e) == "positiv")
        valence_over_time.append({"bucket": k, "positive_share": round(pos / n * 100, 1) if n else None})

    today = dt.date.today()
    month_start = today.replace(day=1)
    cur = Counter()
    for d in dreams:
        if d.date >= month_start:
            for e in (e.strip() for e in (d.emotions or "").split(",") if e.strip()):
                cur[e] += 1
    cur_total = sum(cur.values())
    cur_pos = sum(c for e, c in cur.items() if EMOTION_VALENCE.get(e) == "positiv")

    combo_list_place = sorted(
        ({"emotion": e, "place": p, "count": c} for e, places in emotion_place.items() for p, c in places.items()),
        key=lambda x: -x["count"],
    )[:5]
    combo_list_person = sorted(
        ({"emotion": e, "person": p, "count": c} for e, persons in emotion_person.items() for p, c in persons.items()),
        key=lambda x: -x["count"],
    )[:5]

    return {
        "distribution": [{"emotion": e, "count": c} for e, c in emotion_counter.most_common()],
        "lucid_correlation": [
            {"emotion": e, "total": emotion_counter[e], "lucid": emotion_lucid[e]} for e in emotion_counter
        ],
        "lucid_quote": [
            {"emotion": e, "rate": round(emotion_lucid[e] / emotion_counter[e] * 100, 1)}
            for e in emotion_counter if emotion_counter[e] >= 3
        ],
        "over_time": over_time,
        "top_emotions": top6,
        "valence": {
            "legend": EMOTION_VALENCE,
            "over_time": valence_over_time,
            "current_month_positive_share": round(cur_pos / cur_total * 100, 1) if cur_total else None,
        },
        "top_pairs": [{"a": a, "b": b, "count": c} for (a, b), c in pair_counter.most_common(5)],
        "place_matrix": {e: [{"place": p, "count": c} for p, c in places.most_common(5)] for e, places in emotion_place.items()},
        "person_matrix": {e: [{"person": p, "count": c} for p, c in persons.most_common(5)] for e, persons in emotion_person.items()},
        "top_place_combos": combo_list_place,
        "top_person_combos": combo_list_person,
    }


@router.get("/stats")
def stats(
    date_from: dt.date | None = Query(default=None, alias="from"),
    date_to: dt.date | None = Query(default=None, alias="to"),
    granularity: str = Query(default="week", pattern="^(day|week|month)$"),
    split: str | None = Query(default=None, pattern="^(beifuss|weekend|big_dream)$"),
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

    per_bucket = build_per_bucket(dreams, granularity)

    split_data = None
    groups = split_groups(dreams, split)
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
        "emotions_analysis": emotions_analysis,
        "correlations": correlations,
    }


# ---------- Traumatlas ----------

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


# ---------- Traum-Echos ----------

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


# ---------- Traumweltkarte ----------

class MapNodeIn(BaseModel):
    x: float = PField(ge=0, le=1)
    y: float = PField(ge=0, le=1)


class MapPathIn(BaseModel):
    from_tag_id: int
    to_tag_id: int
    note: str | None = None


@router.get("/map")
def get_map(session: Session = Depends(get_session)):
    dreams = session.exec(select(Dream)).all()
    place_tags = session.exec(select(Tag).where(Tag.kind == "place")).all()
    nodes = session.exec(select(MapNode)).all()
    paths = session.exec(select(MapPath)).all()

    tag_dream_count: Counter[int] = Counter()
    tag_lucid_count: Counter[int] = Counter()
    for d in dreams:
        for t in d.tags:
            if t.kind == "place":
                tag_dream_count[t.id] += 1
                if d.lucidity >= 3:
                    tag_lucid_count[t.id] += 1

    node_ids = {n.tag_id for n in nodes}
    node_map = {n.tag_id: n for n in nodes}
    tag_map = {t.id: t for t in place_tags}

    placed = []
    for n in nodes:
        tag = tag_map.get(n.tag_id)
        if tag:
            placed.append({
                "tag_id": n.tag_id, "name": tag.name, "x": n.x, "y": n.y,
                "dream_count": tag_dream_count[n.tag_id],
                "lucid_count": tag_lucid_count[n.tag_id],
            })

    unplaced = [
        {"tag_id": t.id, "name": t.name, "dream_count": tag_dream_count[t.id]}
        for t in place_tags
        if t.id not in node_ids and tag_dream_count[t.id] > 0
    ]

    path_list = [
        {"id": p.id, "from_tag_id": p.from_tag_id, "to_tag_id": p.to_tag_id, "note": p.note}
        for p in paths
    ]

    return {"placed": placed, "unplaced": unplaced, "paths": path_list}


@router.put("/map/nodes/{tag_id}")
def upsert_map_node(tag_id: int, payload: MapNodeIn, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag or tag.kind != "place":
        raise HTTPException(400, "Nur Orte können auf der Karte platziert werden")
    node = session.get(MapNode, tag_id)
    if node:
        node.x = payload.x
        node.y = payload.y
    else:
        node = MapNode(tag_id=tag_id, x=payload.x, y=payload.y)
    session.add(node)
    session.commit()
    return {"tag_id": tag_id, "x": node.x, "y": node.y}


@router.delete("/map/nodes/{tag_id}", status_code=204)
def delete_map_node(tag_id: int, session: Session = Depends(get_session)):
    node = session.get(MapNode, tag_id)
    if not node:
        raise HTTPException(404, "Knoten nicht gefunden")
    paths = session.exec(
        select(MapPath).where((MapPath.from_tag_id == tag_id) | (MapPath.to_tag_id == tag_id))
    ).all()
    for p in paths:
        session.delete(p)
    session.delete(node)
    session.commit()


@router.post("/map/paths", status_code=201)
def create_map_path(payload: MapPathIn, session: Session = Depends(get_session)):
    if not session.get(MapNode, payload.from_tag_id) or not session.get(MapNode, payload.to_tag_id):
        raise HTTPException(400, "Beide Orte müssen platziert sein")
    existing = session.exec(
        select(MapPath).where(
            ((MapPath.from_tag_id == payload.from_tag_id) & (MapPath.to_tag_id == payload.to_tag_id)) |
            ((MapPath.from_tag_id == payload.to_tag_id) & (MapPath.to_tag_id == payload.from_tag_id))
        )
    ).first()
    if existing:
        raise HTTPException(409, "Dieser Weg existiert bereits")
    path = MapPath(from_tag_id=payload.from_tag_id, to_tag_id=payload.to_tag_id, note=payload.note)
    session.add(path)
    session.commit()
    session.refresh(path)
    return {"id": path.id, "from_tag_id": path.from_tag_id, "to_tag_id": path.to_tag_id, "note": path.note}


@router.delete("/map/paths/{path_id}", status_code=204)
def delete_map_path(path_id: int, session: Session = Depends(get_session)):
    path = session.get(MapPath, path_id)
    if not path:
        raise HTTPException(404, "Weg nicht gefunden")
    session.delete(path)
    session.commit()


# ---------- Archetypen ----------

VALID_ARCHETYPES = {"schatten", "anima_animus", "weiser", "kind", "trickster", "held", "grosse_mutter", "persona"}


class ArchetypeIn(BaseModel):
    archetype: str | None = None


@router.put("/tags/{tag_id}/archetype")
def set_tag_archetype(tag_id: int, payload: ArchetypeIn, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404, "Tag nicht gefunden")
    if tag.kind != "person":
        raise HTTPException(400, "Nur Personen können einen Archetyp bekommen")
    if payload.archetype and payload.archetype not in VALID_ARCHETYPES:
        raise HTTPException(422, f"Unbekannter Archetyp: {payload.archetype}")
    tag.archetype = payload.archetype
    session.add(tag)
    session.commit()
    return {"id": tag.id, "name": tag.name, "archetype": tag.archetype}


# ---------- Reflexionen ----------

class ReflectionIn(BaseModel):
    question: str
    answer: str = PField(min_length=1)


@router.get("/dreams/{dream_id}/reflections")
def list_reflections(dream_id: int, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "Traum nicht gefunden")
    refs = session.exec(
        select(Reflection).where(Reflection.dream_id == dream_id).order_by(Reflection.created_at)
    ).all()
    return [{"id": r.id, "question": r.question, "answer": r.answer, "created_at": r.created_at.isoformat()} for r in refs]


@router.post("/dreams/{dream_id}/reflections", status_code=201)
def create_reflection(dream_id: int, payload: ReflectionIn, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "Traum nicht gefunden")
    ref = Reflection(dream_id=dream_id, question=payload.question, answer=payload.answer)
    session.add(ref)
    session.commit()
    session.refresh(ref)
    return {"id": ref.id, "question": ref.question, "answer": ref.answer, "created_at": ref.created_at.isoformat()}


@router.delete("/reflections/{ref_id}", status_code=204)
def delete_reflection(ref_id: int, session: Session = Depends(get_session)):
    ref = session.get(Reflection, ref_id)
    if not ref:
        raise HTTPException(404, "Reflexion nicht gefunden")
    session.delete(ref)
    session.commit()


# ---------- Symbol-Notizen (Amplifikation) ----------

class SymbolNoteIn(BaseModel):
    text: str = PField(min_length=1)


@router.get("/tags/{tag_id}/notes")
def list_symbol_notes(tag_id: int, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404, "Tag nicht gefunden")
    notes = session.exec(
        select(SymbolNote).where(SymbolNote.tag_id == tag_id).order_by(SymbolNote.created_at)
    ).all()
    return [{"id": n.id, "text": n.text, "created_at": n.created_at.isoformat()} for n in notes]


@router.post("/tags/{tag_id}/notes", status_code=201)
def create_symbol_note(tag_id: int, payload: SymbolNoteIn, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404, "Tag nicht gefunden")
    if tag.kind not in ("dream_sign", "place", "person"):
        raise HTTPException(400, "Nur Traumzeichen, Orte und Personen können Assoziationen haben")
    note = SymbolNote(tag_id=tag_id, text=payload.text.strip())
    session.add(note)
    session.commit()
    session.refresh(note)
    return {"id": note.id, "text": note.text, "created_at": note.created_at.isoformat()}


@router.delete("/symbol-notes/{note_id}", status_code=204)
def delete_symbol_note(note_id: int, session: Session = Depends(get_session)):
    note = session.get(SymbolNote, note_id)
    if not note:
        raise HTTPException(404, "Notiz nicht gefunden")
    session.delete(note)
    session.commit()


# ---------- Aktive Imagination ----------

class ImaginationIn(BaseModel):
    text: str = PField(min_length=1)


@router.get("/dreams/{dream_id}/imaginations")
def list_imaginations(dream_id: int, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "Traum nicht gefunden")
    imgs = session.exec(
        select(Imagination).where(Imagination.dream_id == dream_id).order_by(Imagination.created_at)
    ).all()
    return [{"id": i.id, "text": i.text, "created_at": i.created_at.isoformat()} for i in imgs]


@router.post("/dreams/{dream_id}/imaginations", status_code=201)
def create_imagination(dream_id: int, payload: ImaginationIn, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "Traum nicht gefunden")
    img = Imagination(dream_id=dream_id, text=payload.text.strip())
    session.add(img)
    session.commit()
    session.refresh(img)
    return {"id": img.id, "text": img.text, "created_at": img.created_at.isoformat()}


@router.delete("/imaginations/{img_id}", status_code=204)
def delete_imagination(img_id: int, session: Session = Depends(get_session)):
    img = session.get(Imagination, img_id)
    if not img:
        raise HTTPException(404, "Imagination nicht gefunden")
    session.delete(img)
    session.commit()


# ---------- Innenwelt (J.3) ----------

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


# ---------- Mandala (J.4) ----------

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


# ---------- Individuationsreise (J.5) ----------

JOURNEY_STATIONS = ["landkarte", "persona", "schatten", "anima", "symbole", "selbst"]


@router.get("/journey")
def get_journey(session: Session = Depends(get_session)):
    steps = session.exec(select(JourneyStep)).all()
    step_map = {s.station: s for s in steps}
    return [
        {
            "station": st,
            "completed": step_map[st].completed_at.isoformat() if st in step_map and step_map[st].completed_at else None,
            "note": step_map[st].note if st in step_map else None,
        }
        for st in JOURNEY_STATIONS
    ]


class JourneyCompleteIn(BaseModel):
    note: str | None = None


@router.post("/journey/{station}")
def complete_journey_station(station: str, payload: JourneyCompleteIn, session: Session = Depends(get_session)):
    if station not in JOURNEY_STATIONS:
        raise HTTPException(400, f"Unbekannte Station: {station}")
    existing = session.exec(select(JourneyStep).where(JourneyStep.station == station)).first()
    if existing:
        existing.note = payload.note
        existing.completed_at = dt.datetime.utcnow()
        session.add(existing)
    else:
        step = JourneyStep(station=station, note=payload.note, completed_at=dt.datetime.utcnow())
        session.add(step)
    session.commit()
    return {"station": station, "completed": True}


# ---------- Traum-Analyse (Jung pro Traum) ----------

ANALYSIS_STATIONS = {"persona", "schatten", "gegenstimme", "kompensation", "symbole", "ganzheit"}


class DreamAnalysisIn(BaseModel):
    station: str
    answer: str = PField(min_length=1)


@router.get("/dreams/{dream_id}/analysis")
def list_dream_analysis(dream_id: int, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "Traum nicht gefunden")
    entries = session.exec(
        select(DreamAnalysis).where(DreamAnalysis.dream_id == dream_id).order_by(DreamAnalysis.created_at)
    ).all()
    return [{"id": e.id, "station": e.station, "answer": e.answer, "created_at": e.created_at.isoformat()} for e in entries]


@router.post("/dreams/{dream_id}/analysis", status_code=201)
def create_dream_analysis(dream_id: int, payload: DreamAnalysisIn, session: Session = Depends(get_session)):
    dream = session.get(Dream, dream_id)
    if not dream:
        raise HTTPException(404, "Traum nicht gefunden")
    if payload.station not in ANALYSIS_STATIONS:
        raise HTTPException(422, f"Unbekannte Station: {payload.station}")
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
        raise HTTPException(404, "Analyse nicht gefunden")
    session.delete(entry)
    session.commit()


# ---------- Synchronizitäts-Journal (J.6) ----------

class SyncEventIn(BaseModel):
    dream_id: int | None = None
    date: dt.date
    text: str = PField(min_length=1)


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
            raise HTTPException(404, "Traum nicht gefunden")
    event = SyncEvent(dream_id=payload.dream_id, date=payload.date, text=payload.text.strip())
    session.add(event)
    session.commit()
    session.refresh(event)
    return {"id": event.id, "dream_id": event.dream_id, "date": event.date.isoformat(), "text": event.text, "created_at": event.created_at.isoformat()}


@router.delete("/sync-events/{event_id}", status_code=204)
def delete_sync_event(event_id: int, session: Session = Depends(get_session)):
    event = session.get(SyncEvent, event_id)
    if not event:
        raise HTTPException(404, "Ereignis nicht gefunden")
    session.delete(event)
    session.commit()


# ---------- Daten-Info ----------

@router.get("/datainfo")
def data_info(session: Session = Depends(get_session)):
    import os
    db_file = DATA_DIR / "dreams.db"
    db_size = os.path.getsize(db_file) if db_file.exists() else 0
    dream_count = len(session.exec(select(Dream)).all())
    return {
        "data_dir": str(DATA_DIR),
        "db_file": str(db_file),
        "db_size_bytes": db_size,
        "dream_count": dream_count,
    }


# ---------- Export ----------

@router.get("/export")
def export_data(format: str = "json", session: Session = Depends(get_session)):
    dreams = session.exec(select(Dream).order_by(col(Dream.date))).all()
    rows = [to_out(d).model_dump() for d in dreams]
    filename = f"klartraum-export-{dt.date.today().isoformat()}"

    if format == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "id", "date", "title", "content", "lucidity", "sleep_quality",
            "beifuss", "tags", "dream_signs", "places", "persons", "notes_analysis",
        ])
        for r in rows:
            writer.writerow([
                r["id"], r["date"], r["title"], r["content"], r["lucidity"],
                r["sleep_quality"], int(r["beifuss"]),
                "|".join(r["tags"]), "|".join(r["dream_signs"]),
                "|".join(r["places"]), "|".join(r["persons"]),
                r["notes_analysis"] or "",
            ])
        return Response(
            buf.getvalue(),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"},
        )

    return Response(
        json.dumps(rows, default=str, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}.json"},
    )


app.include_router(router)

# Frontend zuletzt mounten, damit /api/* Vorrang hat
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
