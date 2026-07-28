"""N.1: Schlafzeit-Erfassung — die Nacht als eigene Einheit (nicht der Traum).

sleep_minutes wird ausschließlich hier serverseitig abgeleitet:
- exact: (wake - bed) mod 24h (Mitternachts-Übergang korrekt)
- rough: Bucket-Mitte
- unknown: null
"""
import datetime as dt
import json
import re

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, col, select

from deps import get_session, require_auth
from models import Night
from schemas import NightIn
from stats_helpers import _circular_mean_time
from tracker_adapters import TrackerImportError, parse_mi_fitness

router = APIRouter(prefix="/api/nights", dependencies=[Depends(require_auth)])

# TD.2: fill_empty (Default) füllt nur Nächte ohne Zeiten, tracker_wins
# überschreibt immer, phases_only lässt Zeiten/confidence/source unangetastet
# und ergänzt nur die Tracker-Felder.
OVERWRITE_MODES = {"fill_empty", "tracker_wins", "phases_only"}
ADAPTERS = {"mi_fitness"}

TIME_RE = re.compile(r"^([01]\d|2[0-3]):(00|15|30|45)$")

# Bucket-Mitten in Minuten (N.1): unter6 -> 5,5h, 6bis7 -> 6,5h, 7bis8 -> 7,5h, ueber8 -> 8,5h
BUCKET_MINUTES = {
    "unter6": 330,
    "6bis7": 390,
    "7bis8": 450,
    "ueber8": 510,
}


def _time_to_minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _derive_exact_minutes(bed_time: str, wake_time: str) -> int:
    return (_time_to_minutes(wake_time) - _time_to_minutes(bed_time)) % (24 * 60)


def _night_out(night: Night) -> dict:
    return {
        "date": night.date.isoformat(),
        "bed_time": night.bed_time,
        "wake_time": night.wake_time,
        "sleep_minutes": night.sleep_minutes,
        "confidence": night.confidence,
        # TD.1: Tracker-Vokabular -- source unterscheidet manuell/Tracker,
        # der Rest ist nur bei source="tracker" befuellt (kommt aus TD.2).
        "source": night.source,
        "rem_minutes": night.rem_minutes,
        "deep_minutes": night.deep_minutes,
        "light_minutes": night.light_minutes,
        "awake_minutes": night.awake_minutes,
        "awakenings": night.awakenings,
        "tracker_score": night.tracker_score,
        "hr_min": night.hr_min,
        "hr_avg": night.hr_avg,
        "hr_max": night.hr_max,
        "sleep_latency_minutes": night.sleep_latency_minutes,
        # als Objekt statt Doppel-JSON-String ausliefern -- fürs Frontend
        # (SS.2-Hypnogramm) direkt verwendbar.
        "stages": json.loads(night.stages_json) if night.stages_json else None,
    }


@router.get("/latest-exact")
def latest_exact_night(session: Session = Depends(get_session)):
    stmt = select(Night).where(Night.confidence == "exact").order_by(col(Night.date).desc())
    night = session.exec(stmt).first()
    return _night_out(night) if night else None


@router.get("/median-bedtime")
def median_bedtime(session: Session = Depends(get_session)):
    """N.4: Vorbelegung für den WBTB-Rechner. Median über alle exact-Nächte
    (nur die haben bed_time); rough/unknown fließen nicht ein. Vereinfachung:
    Median auf Minuten-seit-Mitternacht, keine Kreisstatistik über den
    Mitternachts-Übergang — für eine grobe Vorbelegung ausreichend."""
    exact = session.exec(select(Night).where(Night.confidence == "exact")).all()
    bed_times = [n.bed_time for n in exact if n.bed_time]
    result = _circular_mean_time(bed_times)
    if not result:
        return None
    return {"bed_time": result}


def _apply_times(night: Night, nd) -> None:
    night.bed_time = nd.bed_time
    night.wake_time = nd.wake_time
    night.sleep_minutes = nd.sleep_minutes


def _apply_phases(night: Night, nd) -> None:
    night.rem_minutes = nd.rem_minutes
    night.deep_minutes = nd.deep_minutes
    night.light_minutes = nd.light_minutes
    night.awake_minutes = nd.awake_minutes
    night.awakenings = nd.awakenings
    night.tracker_score = nd.tracker_score
    night.hr_min = nd.hr_min
    night.hr_avg = nd.hr_avg
    night.hr_max = nd.hr_max
    night.sleep_latency_minutes = nd.sleep_latency_minutes
    night.stages_json = nd.stages_json


# TD.2: muss VOR der "/{date}"-Route stehen -- sonst matcht Starlette "import"
# als Datums-Pfadparameter (Registrierungsreihenfolge = Match-Reihenfolge).
@router.post("/import")
async def import_nights(
    file: UploadFile = File(...),
    score_file: UploadFile | None = File(None),
    adapter: str = Form(...),
    overwrite_mode: str = Form("fill_empty"),
    session: Session = Depends(get_session),
):
    if adapter not in ADAPTERS:
        raise HTTPException(422, "unknown_adapter")
    if overwrite_mode not in OVERWRITE_MODES:
        raise HTTPException(422, "invalid_overwrite_mode")

    MAX_UPLOAD_BYTES = 10 * 1024 * 1024
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "tracker_import_too_large")
    try:
        fitness_text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(422, "tracker_import_bad_format")
    score_text = None
    if score_file is not None:
        try:
            score_text = (await score_file.read()).decode("utf-8-sig")
        except UnicodeDecodeError:
            raise HTTPException(422, "tracker_import_bad_format")

    try:
        nights_data, nap_skips, row_errors = parse_mi_fitness(fitness_text, score_text)
    except TrackerImportError as exc:
        raise HTTPException(422, str(exc))

    imported = 0
    updated = 0
    skipped = nap_skips

    for nd in nights_data:
        existing = session.get(Night, nd.date)
        is_new = existing is None
        night = existing or Night(date=nd.date)

        if overwrite_mode == "fill_empty":
            if existing is not None and (existing.bed_time or existing.wake_time):
                skipped += 1
                continue
            _apply_times(night, nd)
            _apply_phases(night, nd)
            night.source = "tracker"
            night.confidence = "exact"
        elif overwrite_mode == "tracker_wins":
            _apply_times(night, nd)
            _apply_phases(night, nd)
            night.source = "tracker"
            night.confidence = "exact"
        else:  # phases_only -- Zeiten/confidence/source bewusst unangetastet
            _apply_phases(night, nd)

        session.add(night)
        if is_new:
            imported += 1
        else:
            updated += 1

    session.commit()
    return {"imported": imported, "updated": updated, "skipped": skipped, "errors": row_errors}


def _night_list_out(night: Night) -> dict:
    # SS.2: kompakte Projektion fuer Listenansichten -- ohne stages_json
    # (kann pro Nacht mehrere KB sein), das holt sich die Detail-Ansicht
    # gezielt ueber GET /{date}. Dieselbe Liste soll spaeter SS.1s
    # Nacht-Balken speisen koennen (deshalb generisch, nicht nur Tracker-Naechte).
    return {
        "date": night.date.isoformat(),
        "bed_time": night.bed_time,
        "wake_time": night.wake_time,
        "sleep_minutes": night.sleep_minutes,
        "confidence": night.confidence,
        "source": night.source,
        "rem_minutes": night.rem_minutes,
        "deep_minutes": night.deep_minutes,
        "light_minutes": night.light_minutes,
        "awake_minutes": night.awake_minutes,
        "tracker_score": night.tracker_score,
        "has_stages": night.stages_json is not None,
    }


# Muss VOR "/{date}" stehen (Registrierungsreihenfolge = Match-Reihenfolge).
@router.get("")
def list_nights(limit: int = 90, session: Session = Depends(get_session)):
    stmt = select(Night).order_by(col(Night.date).desc()).limit(limit)
    nights = session.exec(stmt).all()
    return [_night_list_out(n) for n in nights]


@router.get("/medians")
def night_medians(session: Session = Depends(get_session)):
    """SS.2: Vergleichswerte fuer "diese Nacht hatte X min -- dein Median: Y
    min". Nur aus Tracker-Naechten (manuelle Erfassung kennt keine Phasen)."""
    tracker_nights = [
        n for n in session.exec(select(Night)).all()
        if n.rem_minutes is not None and n.deep_minutes is not None
        and n.light_minutes is not None and n.awake_minutes is not None
    ]

    def med(values: list[int]) -> float | None:
        if not values:
            return None
        s = sorted(values)
        n = len(s)
        return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2

    return {
        "n_total": len(tracker_nights),
        "rem_minutes": med([n.rem_minutes for n in tracker_nights]),
        "deep_minutes": med([n.deep_minutes for n in tracker_nights]),
        "light_minutes": med([n.light_minutes for n in tracker_nights]),
        "awake_minutes": med([n.awake_minutes for n in tracker_nights]),
    }


@router.get("/{date}")
def get_night(date: dt.date, session: Session = Depends(get_session)):
    night = session.get(Night, date)
    if not night:
        raise HTTPException(404, "night_not_found")
    return _night_out(night)


@router.put("/{date}")
def upsert_night(date: dt.date, payload: NightIn, session: Session = Depends(get_session)):
    is_exact_attempt = payload.bed_time is not None or payload.wake_time is not None
    is_rough_attempt = payload.bucket is not None
    is_unknown_attempt = payload.unknown is True
    if sum([is_exact_attempt, is_rough_attempt, is_unknown_attempt]) != 1:
        raise HTTPException(422, "invalid_night_payload")

    night = session.get(Night, date) or Night(date=date)
    # TD.1: manuelle Nachbearbeitung setzt source zurück auf "manual" -- auch
    # wenn die Nacht zuvor per Tracker-Import befüllt wurde. Die Phasen-/
    # Puls-/Score-Felder werden hier bewusst NICHT angefasst (bleiben stehen),
    # nur Zeiten/Konfidenz wechseln je nach gewähltem Modus unten.
    night.source = "manual"

    if is_rough_attempt:
        if payload.bucket not in BUCKET_MINUTES:
            raise HTTPException(422, "invalid_night_payload")
        night.bed_time = None
        night.wake_time = None
        night.confidence = "rough"
        night.sleep_minutes = BUCKET_MINUTES[payload.bucket]
    elif is_unknown_attempt:
        night.bed_time = None
        night.wake_time = None
        night.confidence = "unknown"
        night.sleep_minutes = None
    else:
        if payload.bed_time is None or payload.wake_time is None:
            raise HTTPException(422, "invalid_night_payload")
        if not TIME_RE.match(payload.bed_time) or not TIME_RE.match(payload.wake_time):
            raise HTTPException(422, "invalid_night_payload")
        if payload.bed_time == payload.wake_time:
            raise HTTPException(422, "invalid_night_payload")
        night.bed_time = payload.bed_time
        night.wake_time = payload.wake_time
        night.confidence = "exact"
        night.sleep_minutes = _derive_exact_minutes(payload.bed_time, payload.wake_time)

    session.add(night)
    session.commit()
    session.refresh(night)
    return _night_out(night)


@router.delete("/{date}", status_code=204)
def delete_night(date: dt.date, session: Session = Depends(get_session)):
    night = session.get(Night, date)
    if night:
        session.delete(night)
        session.commit()
