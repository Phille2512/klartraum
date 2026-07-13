"""S.3: Statistik-Berechnungen für routers/stats.py, reine Umzugsarbeit aus
main.py (in eigenes Modul ausgelagert, damit routers/stats.py < 300 Zeilen bleibt)."""
import datetime as dt
from collections import Counter

from models import Dream

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
