"""D.3: Erkenntnis-Engine -- kleine Generator-Funktionen, die aus den
Bestandsdaten Findings ableiten ("Die App analysiert, nicht der Nutzer").
Jeder Generator bekommt (dreams, all_dreams, nights) -- dreams ist die
zeitraum-gefilterte Liste wie beim /api/stats-Endpoint, all_dreams die
komplette Historie fuer "Gesamtbild"-Vergleiche (analog zur Terzil-
Referenz aus N.3) -- und liefert ein Finding oder None.

Ein Finding ist reine Daten (text_key + params); den Satz baut t() im
Frontend, zweisprachig -- die Engine formuliert nie fertige Saetze
(Konvention 9). Zwei Waechter halten Rauschen von "Befunden" fern:
- n-Waechter: mindestens MIN_N pro Vergleichsgruppe (konsistent mit der
  nBadge-Schwelle aus E.2), ausser bei den beiden Schwellen-Generatoren
  (Streak, neues Element), die ihre eigene, im Plan explizit genannte
  Mindestgroesse mitbringen.
- Effekt-Mindestschwelle je Generator (z.B. >=20% relativer Unterschied),
  damit ein Unterschied von 2 Prozentpunkten nicht als "Befund" auftritt.
"""
import datetime as dt
from collections import Counter

from helpers import has_substance
from models import Dream, Night
from stats_helpers import build_per_bucket, build_sleep_analysis, compute_streak

MIN_N = 5  # konsistent mit der nBadge-Schwelle aus E.2 (stats.js)

WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def _lucid_rate(dreams: list[Dream]) -> float:
    if not dreams:
        return 0.0
    return sum(1 for d in dreams if d.lucidity >= 3) / len(dreams) * 100


def gen_writing_trend(dreams: list[Dream], all_dreams: list[Dream], nights: list[Night]) -> dict | None:
    buckets = build_per_bucket(dreams, "week")
    if len(buckets) < 8:
        return None
    recent, prior = buckets[-4:], buckets[-8:-4]
    n_recent = sum(b["total"] for b in recent)
    n_prior = sum(b["total"] for b in prior)
    if n_recent < MIN_N or n_prior < MIN_N:
        return None
    words_prior = sum(b["words"] for b in prior) / n_prior
    if not words_prior:
        return None
    words_recent = sum(b["words"] for b in recent) / n_recent
    rel = (words_recent - words_prior) / words_prior
    if abs(rel) < 0.20:
        return None
    return {
        "id": "writing_trend", "section": "write", "anchor": "card-recall",
        "text_key": "insights.writingTrendUp" if rel > 0 else "insights.writingTrendDown",
        "params": {"pct": round(abs(rel) * 100), "n": n_recent + n_prior},
        "effect": round(abs(rel), 4), "n": n_recent + n_prior,
    }


def gen_streak(dreams: list[Dream], all_dreams: list[Dream], nights: list[Night]) -> dict | None:
    streak = compute_streak(dreams)
    if streak < 7:
        return None
    return {
        "id": "streak", "section": "write", "anchor": "card-heatmap",
        "text_key": "insights.streak", "params": {"days": streak},
        "effect": streak, "n": streak,
    }


def gen_new_element(dreams: list[Dream], all_dreams: list[Dream], nights: list[Night]) -> dict | None:
    cutoff = dt.date.today() - dt.timedelta(days=14)
    first_seen: dict[tuple[str, str], dt.date] = {}
    counts: Counter[tuple[str, str]] = Counter()
    for d in sorted(all_dreams, key=lambda x: x.date):
        for t in d.tags:
            if t.kind not in ("dream_sign", "place", "person"):
                continue
            key = (t.kind, t.name)
            if key not in first_seen:
                first_seen[key] = d.date
            if d.date >= cutoff:
                counts[key] += 1
    candidates = [
        (key, n) for key, n in counts.items()
        if n >= 3 and first_seen[key] >= cutoff
    ]
    if not candidates:
        return None
    (kind, name), n = max(candidates, key=lambda c: (c[1], c[0][1]))
    text_key = {
        "place": "insights.newElementPlace",
        "person": "insights.newElementPerson",
        "dream_sign": "insights.newElementSign",
    }[kind]
    return {
        "id": "new_element", "section": "compass", "anchor": "new-elements-card",
        "text_key": text_key, "params": {"name": name, "n": n},
        "effect": n, "n": n,
    }


def gen_emotion_shift(dreams: list[Dream], all_dreams: list[Dream], nights: list[Night]) -> dict | None:
    def shares(group: list[Dream]) -> Counter:
        c: Counter[str] = Counter()
        for d in group:
            for e in (e.strip() for e in (d.emotions or "").split(",") if e.strip()):
                c[e] += 1
        return c

    current = shares(dreams)
    overall = shares(all_dreams)
    n_current = sum(current.values())
    n_overall = sum(overall.values())
    if not n_current or not n_overall:
        return None

    best = None
    for emo, n in current.items():
        if n < MIN_N:
            continue
        delta = (n / n_current) - (overall.get(emo, 0) / n_overall)
        if best is None or abs(delta) > abs(best[1]):
            best = (emo, delta, n)
    if best is None:
        return None
    emo, delta, n = best
    if abs(delta) < 0.15:
        return None
    return {
        "id": "emotion_shift", "section": "emotions", "anchor": "emotion-section",
        "text_key": "insights.emotionShiftUp" if delta > 0 else "insights.emotionShiftDown",
        "params": {"emotion": emo, "pct": round(abs(delta) * 100), "n": n},
        "effect": round(abs(delta), 4), "n": n,
    }


def gen_sleep_words(dreams: list[Dream], all_dreams: list[Dream], nights: list[Night]) -> dict | None:
    sleep = build_sleep_analysis(all_dreams, nights)
    if not sleep["available"]:
        return None
    kurz, lang = sleep["kurz"], sleep["lang"]
    if kurz["n_dreams"] < MIN_N or lang["n_dreams"] < MIN_N or not kurz["avg_words"]:
        return None
    rel = (lang["avg_words"] - kurz["avg_words"]) / kurz["avg_words"]
    if abs(rel) < 0.20:
        return None
    return {
        "id": "sleep_words", "section": "experiments", "anchor": "card-sleep",
        "text_key": "insights.sleepWordsMore" if rel > 0 else "insights.sleepWordsLess",
        "params": {"pct": round(abs(rel) * 100), "n": kurz["n_dreams"] + lang["n_dreams"]},
        "effect": round(abs(rel), 4), "n": kurz["n_dreams"] + lang["n_dreams"],
    }


def gen_weekday(dreams: list[Dream], all_dreams: list[Dream], nights: list[Night]) -> dict | None:
    if not dreams:
        return None
    overall_rate = _lucid_rate(dreams)
    by_weekday: dict[int, list[Dream]] = {}
    for d in dreams:
        by_weekday.setdefault(d.date.weekday(), []).append(d)

    best = None
    for wd, group in by_weekday.items():
        if len(group) < MIN_N:
            continue
        rate = _lucid_rate(group)
        deviation = rate - overall_rate
        if best is None or abs(deviation) > abs(best[1]):
            best = (wd, deviation, rate, len(group))
    if best is None:
        return None
    wd, deviation, rate, n = best
    if abs(deviation) < 20:
        return None
    return {
        "id": "weekday", "section": "lucidity", "anchor": "card-weeks",
        "text_key": "insights.weekdayHigh" if deviation > 0 else "insights.weekdayLow",
        "params": {"day": WEEKDAY_KEYS[wd], "pct": round(rate), "n": n},
        "effect": round(abs(deviation) / 100, 4), "n": n,
    }


def gen_lucid_rate_change(dreams: list[Dream], all_dreams: list[Dream], nights: list[Night]) -> dict | None:
    # Schlafend-Regel (wie E.6/D.2): erst ab dem ersten Klartraum ueberhaupt.
    if not any(d.lucidity >= 3 for d in all_dreams):
        return None
    buckets = build_per_bucket(dreams, "week")
    if len(buckets) < 8:
        return None
    recent, prior = buckets[-4:], buckets[-8:-4]
    n_recent = sum(b["total"] for b in recent)
    n_prior = sum(b["total"] for b in prior)
    if n_recent < MIN_N or n_prior < MIN_N:
        return None
    rate_recent = sum(b["lucid"] for b in recent) / n_recent * 100
    rate_prior = sum(b["lucid"] for b in prior) / n_prior * 100
    delta = rate_recent - rate_prior
    if abs(delta) < 15:
        return None
    return {
        "id": "lucid_rate_change", "section": "lucidity", "anchor": "card-lucidity-dist",
        "text_key": "insights.lucidRateChangeUp" if delta > 0 else "insights.lucidRateChangeDown",
        "params": {"pct": round(abs(delta)), "n": n_recent + n_prior},
        "effect": round(abs(delta) / 100, 4), "n": n_recent + n_prior,
    }


def gen_beifuss(dreams: list[Dream], all_dreams: list[Dream], nights: list[Night]) -> dict | None:
    # Schlafend-Regel: erst ab dem ersten Klartraum ueberhaupt.
    if not any(d.lucidity >= 3 for d in all_dreams):
        return None
    with_group = [d for d in all_dreams if has_substance(d, "beifuss")]
    without_group = [d for d in all_dreams if not has_substance(d, "beifuss")]
    if len(with_group) < MIN_N or len(without_group) < MIN_N:
        return None
    rate_with = _lucid_rate(with_group)
    rate_without = _lucid_rate(without_group)
    delta = rate_with - rate_without
    if abs(delta) < 20:
        return None
    return {
        "id": "beifuss", "section": "experiments", "anchor": "card-beifuss",
        "text_key": "insights.beifussUp" if delta > 0 else "insights.beifussDown",
        "params": {"pct": round(abs(delta)), "n": len(with_group) + len(without_group)},
        "effect": round(abs(delta) / 100, 4), "n": len(with_group) + len(without_group),
    }


GENERATORS = [
    gen_writing_trend, gen_streak, gen_new_element, gen_emotion_shift,
    gen_sleep_words, gen_weekday, gen_lucid_rate_change, gen_beifuss,
]


def generate_findings(dreams: list[Dream], all_dreams: list[Dream], nights: list[Night]) -> list[dict]:
    findings = [f for gen in GENERATORS if (f := gen(dreams, all_dreams, nights)) is not None]
    findings.sort(key=lambda f: -f["effect"])
    return findings
