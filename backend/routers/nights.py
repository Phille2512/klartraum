"""N.1: Schlafzeit-Erfassung — die Nacht als eigene Einheit (nicht der Traum).

sleep_minutes wird ausschließlich hier serverseitig abgeleitet:
- exact: (wake - bed) mod 24h (Mitternachts-Übergang korrekt)
- rough: Bucket-Mitte
- unknown: null
"""
import datetime as dt
import json
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, select

from deps import get_session, require_auth
from models import Night
from schemas import NightIn

router = APIRouter(prefix="/api/nights", dependencies=[Depends(require_auth)])

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
    minutes = sorted(_time_to_minutes(n.bed_time) for n in exact if n.bed_time)
    if not minutes:
        return None
    n = len(minutes)
    med = minutes[n // 2] if n % 2 else round((minutes[n // 2 - 1] + minutes[n // 2]) / 2)
    return {"bed_time": f"{med // 60:02d}:{med % 60:02d}"}


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
