"""S.3: Statistik-Berechnungen für routers/stats.py, reine Umzugsarbeit aus
main.py (in eigenes Modul ausgelagert, damit routers/stats.py < 300 Zeilen bleibt)."""
import datetime as dt
import itertools
import json
from collections import Counter

from helpers import has_substance
from models import Dream, Night
from tracker_adapters import STATE_AWAKE, STATE_REM

# Valenz-Konstante für die Emotions-Analyse (A.5) — im Frontend per 💡 offengelegt
EMOTION_VALENCE = {
    "freude": "positiv", "liebe": "positiv", "frieden": "positiv",
    "staunen": "positiv", "neugier": "positiv", "sehnsucht": "positiv",
    "angst": "negativ", "trauer": "negativ", "wut": "negativ",
    "ekel": "negativ", "scham": "negativ",
    "verwirrung": "neutral",
}


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


def split_groups(
    dreams: list[Dream], split: str | None, nights: list[Night] | None = None,
) -> tuple[str, str, list[Dream], list[Dream]] | None:
    if split == "beifuss":
        return (
            "🌿 Mit Beifuß", "Ohne Beifuß",
            [d for d in dreams if has_substance(d, "beifuss")],
            [d for d in dreams if not has_substance(d, "beifuss")],
        )
    if split == "weekend":
        return "Wochenende", "Werktag", [d for d in dreams if d.date.weekday() >= 5], [d for d in dreams if d.date.weekday() < 5]
    if split == "big_dream":
        return "⭐ Große Träume", "Andere Träume", [d for d in dreams if d.big_dream], [d for d in dreams if not d.big_dream]
    if split == "sleep":
        # N.3: Split am persönlichen Median der Schlafdauer (alle erfassten Nächte,
        # nicht nur der aktuell gefilterte Zeitraum — "deine typische Nacht" ist
        # eine stabile Referenz). Nächte ohne sleep_minutes (unknown/nicht erfasst)
        # fließen nirgends ein; Träume ohne zugehörige Nacht ebenfalls nicht.
        scored = sorted(n.sleep_minutes for n in (nights or []) if n.sleep_minutes is not None)
        if not scored:
            return "😴 Länger als sonst", "😴 Kürzer als sonst", [], []
        med = median(scored)
        by_date = {n.date: n.sleep_minutes for n in (nights or []) if n.sleep_minutes is not None}
        longer = [d for d in dreams if by_date.get(d.date) is not None and by_date[d.date] >= med]
        shorter = [d for d in dreams if by_date.get(d.date) is not None and by_date[d.date] < med]
        return "😴 Länger als sonst", "😴 Kürzer als sonst", longer, shorter
    return None


def median(values: list[float]) -> float | None:
    if not values:
        return None
    s = sorted(values)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


def build_sleep_analysis(dreams: list[Dream], nights: list[Night]) -> dict:
    """N.3: Terzil-Analyse Schlafdauer x Erinnerung, relativ zu den eigenen
    Nächten (keine absoluten Grenzen). Rechnet erst ab >= 9 erfassten Nächten
    (exact oder rough); unknown-Nächte zählen nirgends mit, tauchen aber in
    der Fußzeile als "nicht gezählt" auf."""
    scored = [n for n in nights if n.sleep_minutes is not None]
    n_total = len(scored)
    n_estimated = sum(1 for n in scored if n.confidence == "rough")
    n_unknown = sum(1 for n in nights if n.confidence == "unknown")

    if n_total < 9:
        return {"available": False, "n_total": n_total, "n_estimated": n_estimated, "n_unknown": n_unknown}

    dreams_by_date: dict[dt.date, list[Dream]] = {}
    for d in dreams:
        dreams_by_date.setdefault(d.date, []).append(d)

    sorted_nights = sorted(scored, key=lambda n: n.sleep_minutes)
    i1 = n_total // 3
    i2 = (2 * n_total) // 3
    terciles = {"kurz": sorted_nights[:i1], "mittel": sorted_nights[i1:i2], "lang": sorted_nights[i2:]}

    def group_stats(night_group: list[Night]) -> dict:
        group_dreams = [d for n in night_group for d in dreams_by_date.get(n.date, [])]
        n_dreams = len(group_dreams)
        avg_words = round(sum(len(d.content.split()) for d in group_dreams) / n_dreams, 1) if n_dreams else 0
        lucid_rate = round(sum(1 for d in group_dreams if d.lucidity >= 3) / n_dreams * 100, 1) if n_dreams else 0
        return {"n_nights": len(night_group), "n_dreams": n_dreams, "avg_words": avg_words, "lucid_rate": lucid_rate}

    return {
        "available": True,
        "n_total": n_total,
        "n_estimated": n_estimated,
        "n_unknown": n_unknown,
        "kurz": group_stats(terciles["kurz"]),
        "mittel": group_stats(terciles["mittel"]),
        "lang": group_stats(terciles["lang"]),
    }


# TD.3: Analysen, die nur der Tracker beantworten kann. Baut NUR auf bereits
# existierenden E-Stufen auf (E.2 nBadge im Frontend, EMOTION_VALENCE oben
# fürs künftige E.4/E.7) -- Karten, die E.4b (Tagesbilanz) oder E.5
# (Figuren-Valenz) voraussetzen wuerden, sind hier bewusst NICHT gebaut
# (s. UMSETZUNGSPLAN-TRACKERDATEN.md TD.3 Karten 4/5, warten auf E.4/E.5/E.7).
TRACKER_MIN_NIGHTS = 9


def _tercile_split(items: list, key) -> dict[str, list]:
    """Sortiert nach key und teilt in Drittel -- gleiches Prinzip wie
    build_sleep_analysis (N.3), hier generisch fuer mehrere Kennzahlen."""
    ordered = sorted(items, key=key)
    n = len(ordered)
    i1, i2 = n // 3, (2 * n) // 3
    return {"wenig": ordered[:i1], "mittel": ordered[i1:i2], "viel": ordered[i2:]}


def _awakenings_group(night: Night) -> str:
    aw = night.awakenings or 0
    if aw <= 1:
        return "0-1"
    if aw <= 3:
        return "2-3"
    return "4+"


def build_tracker_analysis(dreams: list[Dream], nights: list[Night]) -> dict:
    """TD.3. Rechnet ab >= 9 Naechten mit vollstaendigen Phasen-Feldern
    (unabhaengig von source -- auch phases_only-Importe zaehlen). Klartraum-
    Quoten erscheinen erst, wenn ueberhaupt ein Traum mit Luzidität >= 3
    existiert (Schlafend-Regel, sonst nur "0%"-Lärm)."""
    tracker_nights = [
        n for n in nights
        if n.rem_minutes is not None and n.deep_minutes is not None
        and n.light_minutes is not None and n.awake_minutes is not None
    ]
    n_total = len(tracker_nights)
    if n_total < TRACKER_MIN_NIGHTS:
        return {"available": False, "n_total": n_total}

    has_lucid = any(d.lucidity >= 3 for d in dreams)
    dreams_by_date: dict[dt.date, list[Dream]] = {}
    for d in dreams:
        dreams_by_date.setdefault(d.date, []).append(d)

    def group_stats(night_group: list[Night]) -> dict:
        group_dreams = [d for n in night_group for d in dreams_by_date.get(n.date, [])]
        n_dreams = len(group_dreams)
        avg_words = round(sum(len(d.content.split()) for d in group_dreams) / n_dreams, 1) if n_dreams else 0
        avg_dreams_per_night = round(n_dreams / len(night_group), 2) if night_group else 0
        lucid_rate = (
            round(sum(1 for d in group_dreams if d.lucidity >= 3) / n_dreams * 100, 1)
            if n_dreams and has_lucid else None
        )
        return {
            "n_nights": len(night_group), "n_dreams": n_dreams,
            "avg_words": avg_words, "avg_dreams_per_night": avg_dreams_per_night,
            "lucid_rate": lucid_rate,
        }

    # 1. REM-Menge (absolute Minuten) vs. REM-Dichte (Anteil an sleep_minutes)
    # -- bewusst getrennt, s. Plan: "lange Nacht" != "REM-reiche Nacht".
    rem_amount_groups = _tercile_split(tracker_nights, key=lambda n: n.rem_minutes)
    rem_amount = {k: group_stats(v) for k, v in rem_amount_groups.items()}

    def rem_share(n: Night) -> float:
        return n.rem_minutes / n.sleep_minutes if n.sleep_minutes else 0.0

    rem_density_groups = _tercile_split(tracker_nights, key=rem_share)
    rem_density = {k: group_stats(v) for k, v in rem_density_groups.items()}
    rem_density_median = median([rem_share(n) for n in tracker_nights])

    # 2. Wachphasen-Gruppen
    aw_groups: dict[str, list[Night]] = {"0-1": [], "2-3": [], "4+": []}
    for n in tracker_nights:
        aw_groups[_awakenings_group(n)].append(n)
    awakenings = {k: group_stats(v) for k, v in aw_groups.items()}

    # 3. Natuerliche WBTB-Naechte (>= 2 Wachphasen) + konkrete Wachmomente
    wbtb_nights = [n for n in tracker_nights if (n.awakenings or 0) >= 2]
    through_nights = [n for n in tracker_nights if (n.awakenings or 0) < 2]
    wbtb = {"wbtb": group_stats(wbtb_nights), "durchgeschlafen": group_stats(through_nights)}

    wake_moments = []
    for n in tracker_nights:
        if not n.stages_json:
            continue
        try:
            parsed = json.loads(n.stages_json)
        except json.JSONDecodeError:
            continue
        segs = sorted(parsed.get("segments", []), key=lambda s: s["s"])
        tz_offset = parsed.get("tz_offset_minutes", 0)
        tz = dt.timezone(dt.timedelta(minutes=tz_offset))
        for i, seg in enumerate(segs):
            if seg.get("st") != STATE_AWAKE:
                continue
            rem_after = 0.0
            for later in segs[i + 1:]:
                if later.get("st") == STATE_AWAKE:
                    break
                if later.get("st") == STATE_REM:
                    rem_after += (later["e"] - later["s"]) / 60
            if rem_after <= 0:
                continue
            wake_time = dt.datetime.fromtimestamp(seg["s"], tz).strftime("%H:%M")
            wake_moments.append({"date": n.date.isoformat(), "time": wake_time, "rem_after_minutes": round(rem_after)})
    wake_moments.sort(key=lambda m: -m["rem_after_minutes"])
    wbtb["wake_moments"] = wake_moments[:5]

    # 6. Gemessen vs. gefühlt: nur Nächte, wo BEIDES existiert -- manuelle
    # Zeiten (source blieb "manual", z. B. phases_only-Import) UND
    # Tracker-Phasen. Das ist genau der Anwendungsfall von phases_only.
    calibration_pairs = [
        {
            "date": n.date.isoformat(),
            "manual_minutes": n.sleep_minutes,
            "tracker_minutes": n.rem_minutes + n.deep_minutes + n.light_minutes + n.awake_minutes,
        }
        for n in tracker_nights
        if n.source == "manual" and n.sleep_minutes is not None
    ]
    avg_deviation = (
        round(sum(p["manual_minutes"] - p["tracker_minutes"] for p in calibration_pairs) / len(calibration_pairs), 1)
        if calibration_pairs else None
    )

    # 7. Tracker-Score-Terzile (nur falls vorhanden)
    scored_nights = [n for n in tracker_nights if n.tracker_score is not None]
    tracker_score = None
    if len(scored_nights) >= TRACKER_MIN_NIGHTS:
        score_groups = _tercile_split(scored_nights, key=lambda n: n.tracker_score)
        tracker_score = {"n_total": len(scored_nights), **{k: group_stats(v) for k, v in score_groups.items()}}

    # 8. Einschlaf-Latenz: Ø, Wochen-Verlauf, Aufriss nach Substanzen
    latency_nights = [n for n in tracker_nights if n.sleep_latency_minutes is not None]
    avg_latency = round(sum(n.sleep_latency_minutes for n in latency_nights) / len(latency_nights), 1) if latency_nights else None

    latency_by_week: dict[str, list[int]] = {}
    for n in latency_nights:
        latency_by_week.setdefault(bucket_key(n.date, "week"), []).append(n.sleep_latency_minutes)
    latency_trend = [
        {"bucket": k, "avg_minutes": round(sum(v) / len(v), 1)}
        for k, v in sorted(latency_by_week.items())
    ]

    def latency_group(has_sub: bool) -> dict:
        group = [
            n for n in latency_nights
            if any(has_substance(d, s) for s in ("beifuss", "melatonin", "alkohol", "weed") for d in dreams_by_date.get(n.date, [])) == has_sub
        ]
        avg = round(sum(n.sleep_latency_minutes for n in group) / len(group), 1) if group else None
        return {"n": len(group), "avg_minutes": avg}

    latency = {
        "n_total": len(latency_nights),
        "avg_minutes": avg_latency,
        "trend": latency_trend,
        "with_substance": latency_group(True),
        "without_substance": latency_group(False),
    }

    return {
        "available": True,
        "n_total": n_total,
        "rem_amount": rem_amount,
        "rem_density": rem_density,
        "rem_density_median_pct": round(rem_density_median * 100, 1) if rem_density_median else None,
        "awakenings": awakenings,
        "wbtb": wbtb,
        "calibration": {"pairs": calibration_pairs, "avg_deviation_minutes": avg_deviation},
        "tracker_score": tracker_score,
        "latency": latency,
    }


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


ELEMENT_KINDS = {"dream_sign", "place", "person"}
MIN_SUPPORT = 3


def build_connections(dreams: list[Dream]) -> dict:
    """E.1: Co-Occurrence-Analyse — welche Elemente (Traumzeichen/Orte/
    Personen) und Emotionen treten gemeinsam auf? Lift = wie viel häufiger
    als bei statistischer Unabhängigkeit erwartet
    (n_together * n_dreams) / (n_a * n_b). Ein Element, das mehrfach im
    selben Traum vorkommt (z. B. zwei Tags gleichen Namens), zählt pro
    Traum nur einmal — daher überall Mengen statt Listen."""
    n_dreams = len(dreams)
    element_counts: Counter[tuple[str, str]] = Counter()
    pair_counts: Counter[frozenset] = Counter()
    emotion_counts: Counter[str] = Counter()
    emotion_element_counts: Counter[tuple[str, tuple[str, str]]] = Counter()

    for d in dreams:
        elements = {(t.kind, t.name) for t in d.tags if t.kind in ELEMENT_KINDS}
        for el in elements:
            element_counts[el] += 1
        for a, b in itertools.combinations(sorted(elements), 2):
            pair_counts[frozenset((a, b))] += 1

        emotions = {e.strip() for e in (d.emotions or "").split(",") if e.strip()}
        for e in emotions:
            emotion_counts[e] += 1
            for el in elements:
                emotion_element_counts[(e, el)] += 1

    def lift(n: int, n_a: int, n_b: int) -> float:
        return round((n * n_dreams) / (n_a * n_b), 2) if n_a and n_b and n_dreams else 0.0

    element_pairs = []
    for pair, n in pair_counts.items():
        if n < MIN_SUPPORT:
            continue
        a, b = sorted(pair)
        element_pairs.append({
            "a": {"kind": a[0], "name": a[1]},
            "b": {"kind": b[0], "name": b[1]},
            "n": n,
            "lift": lift(n, element_counts[a], element_counts[b]),
        })
    element_pairs.sort(key=lambda p: (-p["lift"], -p["n"]))

    emotion_elements = []
    for (emo, el), n in emotion_element_counts.items():
        if n < MIN_SUPPORT:
            continue
        emotion_elements.append({
            "emotion": emo,
            "element": {"kind": el[0], "name": el[1]},
            "n": n,
            "lift": lift(n, emotion_counts[emo], element_counts[el]),
        })
    emotion_elements.sort(key=lambda p: (-p["lift"], -p["n"]))

    return {
        "element_pairs": element_pairs,
        "emotion_elements": emotion_elements,
        "n_dreams": n_dreams,
    }
