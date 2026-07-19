"""TD.2: Import-Adapter fürs Trackerdaten-Format (UMSETZUNGSPLAN-TRACKERDATEN.md).

Jeder Adapter ist eine kleine, isoliert testbare Funktion parse_<adapter>(...)
-> list[NightData]. Kein DB-Zugriff hier -- das Mergen mit bestehenden
Nächten passiert im Router (routers/tracker_import.py).
"""
import csv
import dataclasses
import datetime as dt
import io
import json

# Nickerchen-Schwelle (N.4/TD.2): kurze Tagesschläfchen sollen nicht als Nacht
# zählen. Beide Bedingungen müssen zutreffen -- eine echte kurze NACHT (z. B.
# 2,5 h) darf nicht wegen der Dauer allein rausfallen.
NAP_MAX_MINUTES = 180
NAP_DAYTIME_START_HOUR = 8
NAP_DAYTIME_END_HOUR = 20

# TD.2: verifiziert durch Gegenrechnen (Segment-Summen == Summenfelder) am
# 19.07.2026 gegen Philipps echten Export.
STATE_DEEP = 2
STATE_LIGHT = 3
STATE_REM = 4
STATE_AWAKE = 5

# ≤160 Punkte für die ausgedünnte Puls-Kurve in stages_json (TD.1).
HR_MAX_POINTS = 160


class TrackerImportError(Exception):
    """Datei lässt sich nicht als erwartetes Format lesen (-> err.tracker_import_*)."""


@dataclasses.dataclass
class NightData:
    date: dt.date
    bed_time: str | None = None
    wake_time: str | None = None
    sleep_minutes: int | None = None
    rem_minutes: int | None = None
    deep_minutes: int | None = None
    light_minutes: int | None = None
    awake_minutes: int | None = None
    awakenings: int | None = None
    tracker_score: int | None = None
    hr_min: int | None = None
    hr_avg: int | None = None
    hr_max: int | None = None
    sleep_latency_minutes: int | None = None
    stages_json: str | None = None


def _local_tz(quarter_hours: int) -> dt.timezone:
    # TD.2-Zeitzonen-Falle: "timezone" im Blob ist in VIERTELSTUNDEN
    # (8 = UTC+2), nicht in Stunden -- nicht die System-Zeitzone raten.
    return dt.timezone(dt.timedelta(minutes=quarter_hours * 15))


def _hhmm(epoch: int, tz: dt.timezone) -> str:
    return dt.datetime.fromtimestamp(epoch, tz).strftime("%H:%M")


def _score_lookup(aggregated_csv: str | None) -> dict[int, int]:
    """bedtime-Epoch -> sleep_score, aus der Aggregat-Datei (Key="sleep",
    Tag="daily_report"). Score steckt NICHT im Haupt-Blob, s. Plan."""
    lookup: dict[int, int] = {}
    if not aggregated_csv:
        return lookup
    reader = csv.DictReader(io.StringIO(aggregated_csv))
    if "Key" not in (reader.fieldnames or []):
        raise TrackerImportError("tracker_import_bad_format")
    for row in reader:
        if row.get("Key") != "sleep":
            continue
        try:
            val = json.loads(row["Value"])
        except (json.JSONDecodeError, KeyError):
            continue
        score = val.get("sleep_score")
        if score is None:
            continue
        for seg in val.get("segment_details", []):
            bedtime = seg.get("bedtime")
            if bedtime is not None:
                lookup[bedtime] = score
    return lookup


def _hr_series(rows: list[dict], window_start: int, window_end: int) -> list[list[int]]:
    points = []
    for r in rows:
        if r.get("Key") not in ("heart_rate", "single_heart_rate"):
            continue
        try:
            t = int(r["Time"])
        except (KeyError, ValueError):
            continue
        if not (window_start - 300 <= t <= window_end + 300):
            continue
        try:
            bpm = json.loads(r["Value"]).get("bpm")
        except (json.JSONDecodeError, KeyError):
            continue
        if bpm:
            points.append([t, bpm])
    points.sort(key=lambda p: p[0])
    step = max(1, len(points) // HR_MAX_POINTS)
    return points[::step]


def parse_mi_fitness(
    fitness_csv: str, aggregated_csv: str | None = None
) -> tuple[list[NightData], int, list[str]]:
    """Mi-Fitness-DSGVO-Export (*_hlth_center_fitness_data.csv), optional die
    Aggregat-Datei für den Score. Gibt (Nächte, Anzahl übersprungener
    Nickerchen, Zeilenfehler) zurück. Eine kaputte EINZELNE Schlaf-Zeile
    bricht den Import nicht ab (landet in den Zeilenfehlern) -- nur eine
    strukturell falsche Datei insgesamt wirft TrackerImportError.
    """
    reader = csv.DictReader(io.StringIO(fitness_csv))
    if not {"Key", "Time", "Value"} <= set(reader.fieldnames or []):
        raise TrackerImportError("tracker_import_bad_format")
    rows = list(reader)
    sleep_rows = [r for r in rows if r.get("Key") == "sleep"]
    if not sleep_rows:
        raise TrackerImportError("tracker_import_no_sleep_data")

    score_lookup = _score_lookup(aggregated_csv)

    nights: list[NightData] = []
    nap_skips = 0
    row_errors: list[str] = []
    for row in sleep_rows:
        try:
            val = json.loads(row["Value"])
            tz = _local_tz(val["timezone"])
            bed_ts = val["bed_timestamp"]
            asleep_ts = val["bedtime"]
            wake_ts = val["wake_up_time"]
            duration = val["duration"]
            deep = val["sleep_deep_duration"]
            light = val["sleep_light_duration"]
            rem = val["sleep_rem_duration"]
            awake = val["sleep_awake_duration"]
        except (json.JSONDecodeError, KeyError):
            row_errors.append(f"tracker_import_row_error:{row.get('Time', '?')}")
            continue

        bed_local = dt.datetime.fromtimestamp(bed_ts, tz)
        is_daytime = NAP_DAYTIME_START_HOUR <= bed_local.hour < NAP_DAYTIME_END_HOUR
        if duration < NAP_MAX_MINUTES and is_daytime:
            nap_skips += 1
            continue

        segments = [
            {"s": it["start_time"], "e": it["end_time"], "st": it["state"]}
            for it in val.get("items", [])
        ]
        hr = _hr_series(rows, bed_ts, wake_ts)
        stages = {"segments": segments}
        if hr:
            stages["hr"] = hr

        # N.1: eine Nacht gehört zum Datum des AUFWACHENS (= Traum-Datum).
        wake_date = dt.datetime.fromtimestamp(wake_ts, tz).date()

        nights.append(NightData(
            date=wake_date,
            bed_time=_hhmm(bed_ts, tz),
            wake_time=_hhmm(wake_ts, tz),
            sleep_minutes=duration,
            rem_minutes=rem,
            deep_minutes=deep,
            light_minutes=light,
            awake_minutes=awake,
            awakenings=val.get("awake_count"),
            tracker_score=score_lookup.get(asleep_ts),
            hr_min=val.get("min_hr"),
            hr_avg=val.get("avg_hr"),
            hr_max=val.get("max_hr"),
            sleep_latency_minutes=round((asleep_ts - bed_ts) / 60),
            stages_json=json.dumps(stages),
        ))

    return nights, nap_skips, row_errors
