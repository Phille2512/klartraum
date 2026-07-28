import datetime as dt

from test_dreams import make_dream

# D.3-Fixtures: pro Generator ein Positivfall (exaktes params), ein
# Negativfall (n zu klein) und -- wo mit runden Zahlen sauber moeglich --
# ein Negativfall (Effekt zu klein) plus Grenzwert. Wochen-Buckets nutzen
# 7-Tage-Abstaende ab einem Montag mitten im Jahr, damit jede Woche in
# einem eigenen ISO-Bucket landet (keine Jahreswechsel-Grenzfaelle).


def _insights(auth_client, **params):
    resp = auth_client.get("/api/stats/insights", params=params)
    assert resp.status_code == 200
    return resp.json()["findings"]


def _find(findings, finding_id):
    return next((f for f in findings if f["id"] == finding_id), None)


def _weeks(start, n):
    return [start + dt.timedelta(days=7 * i) for i in range(n)]


def _content(words):
    return " ".join(["wort"] * words)


# ---- writing_trend ----

def test_writing_trend_positive(auth_client):
    start = dt.date(2026, 3, 2)  # Montag
    for i, week in enumerate(_weeks(start, 8)):
        words = 60 if i >= 4 else 50  # letzte 4 Wochen vs. die 4 davor
        for offset in (0, 2):
            auth_client.post("/api/dreams", json=make_dream(
                date=(week + dt.timedelta(days=offset)).isoformat(),
                content=_content(words),
            ))

    findings = _insights(auth_client)
    f = _find(findings, "writing_trend")
    assert f is not None
    assert f["text_key"] == "insights.writingTrendUp"
    # rel = (60-50)/50 = 0.20 -> pct=20, n=8+8
    assert f["params"] == {"pct": 20, "n": 16}


def test_writing_trend_below_effect_threshold(auth_client):
    start = dt.date(2026, 3, 2)
    for i, week in enumerate(_weeks(start, 8)):
        words = 119 if i >= 4 else 100  # rel = 0.19 < 0.20
        for offset in (0, 2):
            auth_client.post("/api/dreams", json=make_dream(
                date=(week + dt.timedelta(days=offset)).isoformat(),
                content=_content(words),
            ))

    findings = _insights(auth_client)
    assert _find(findings, "writing_trend") is None


def test_writing_trend_n_too_small(auth_client):
    start = dt.date(2026, 3, 2)
    for i, week in enumerate(_weeks(start, 8)):
        words = 60 if i >= 4 else 50
        # nur 1 Traum/Woche -> n_recent=4 < MIN_N=5
        auth_client.post("/api/dreams", json=make_dream(date=week.isoformat(), content=_content(words)))

    findings = _insights(auth_client)
    assert _find(findings, "writing_trend") is None


# ---- streak ----

def test_streak_positive(auth_client):
    today = dt.date.today()
    for i in range(7):
        auth_client.post("/api/dreams", json=make_dream(date=(today - dt.timedelta(days=i)).isoformat()))

    findings = _insights(auth_client)
    f = _find(findings, "streak")
    assert f is not None
    assert f["params"] == {"days": 7}
    assert f["effect"] == 7


def test_streak_below_threshold(auth_client):
    today = dt.date.today()
    for i in range(6):  # 6 Tage in Folge, Schwelle ist 7
        auth_client.post("/api/dreams", json=make_dream(date=(today - dt.timedelta(days=i)).isoformat()))

    findings = _insights(auth_client)
    assert _find(findings, "streak") is None


# ---- new_element ----

def test_new_element_positive(auth_client):
    today = dt.date.today()
    for i in range(3):
        auth_client.post("/api/dreams", json=make_dream(
            date=(today - dt.timedelta(days=i)).isoformat(), dream_signs=["kobold"],
        ))

    findings = _insights(auth_client)
    f = _find(findings, "new_element")
    assert f is not None
    assert f["text_key"] == "insights.newElementSign"
    assert f["params"] == {"name": "kobold", "n": 3}


def test_new_element_too_few_occurrences(auth_client):
    today = dt.date.today()
    for i in range(2):  # nur 2x, Schwelle ist 3
        auth_client.post("/api/dreams", json=make_dream(
            date=(today - dt.timedelta(days=i)).isoformat(), dream_signs=["kobold"],
        ))

    findings = _insights(auth_client)
    assert _find(findings, "new_element") is None


def test_new_element_not_actually_new(auth_client):
    today = dt.date.today()
    old = today - dt.timedelta(days=200)
    # Erst-Auftreten liegt weit ausserhalb des 14-Tage-Fensters -> nicht "neu",
    # obwohl es innerhalb der letzten 14 Tage erneut 3x vorkommt.
    auth_client.post("/api/dreams", json=make_dream(date=old.isoformat(), dream_signs=["kobold"]))
    for i in range(3):
        auth_client.post("/api/dreams", json=make_dream(
            date=(today - dt.timedelta(days=i)).isoformat(), dream_signs=["kobold"],
        ))

    findings = _insights(auth_client)
    assert _find(findings, "new_element") is None


# ---- emotion_shift ----

def test_emotion_shift_positive(auth_client):
    # Baseline (ausserhalb des Filterzeitraums): 20 Traeume, nur "freude".
    for i in range(20):
        auth_client.post("/api/dreams", json=make_dream(
            date=(dt.date(2026, 1, 1) + dt.timedelta(days=i)).isoformat(), emotions=["freude"],
        ))
    # Aktueller Zeitraum: 5 Traeume, nur "angst".
    for i in range(5):
        auth_client.post("/api/dreams", json=make_dream(
            date=(dt.date(2026, 4, 1) + dt.timedelta(days=i)).isoformat(), emotions=["angst"],
        ))

    findings = _insights(auth_client, **{"from": "2026-04-01", "to": "2026-04-30"})
    f = _find(findings, "emotion_shift")
    assert f is not None
    assert f["text_key"] == "insights.emotionShiftUp"
    # current_share=5/5=1.0, overall_share=5/25=0.2 -> delta=0.8 -> pct=80
    assert f["params"] == {"emotion": "angst", "pct": 80, "n": 5}


def test_emotion_shift_n_too_small(auth_client):
    for i in range(20):
        auth_client.post("/api/dreams", json=make_dream(
            date=(dt.date(2026, 1, 1) + dt.timedelta(days=i)).isoformat(), emotions=["freude"],
        ))
    for i in range(4):  # nur 4 < MIN_N=5
        auth_client.post("/api/dreams", json=make_dream(
            date=(dt.date(2026, 4, 1) + dt.timedelta(days=i)).isoformat(), emotions=["angst"],
        ))

    findings = _insights(auth_client, **{"from": "2026-04-01", "to": "2026-04-30"})
    assert _find(findings, "emotion_shift") is None


def test_emotion_shift_no_change(auth_client):
    for i in range(20):
        auth_client.post("/api/dreams", json=make_dream(
            date=(dt.date(2026, 1, 1) + dt.timedelta(days=i)).isoformat(), emotions=["freude"],
        ))
    for i in range(5):  # gleiche Emotion wie Baseline -> delta=0
        auth_client.post("/api/dreams", json=make_dream(
            date=(dt.date(2026, 4, 1) + dt.timedelta(days=i)).isoformat(), emotions=["freude"],
        ))

    findings = _insights(auth_client, **{"from": "2026-04-01", "to": "2026-04-30"})
    assert _find(findings, "emotion_shift") is None


# ---- sleep_words ----

def _put_night(auth_client, date, bucket):
    resp = auth_client.put(f"/api/nights/{date}", json={"bucket": bucket})
    assert resp.status_code == 200, resp.text


def test_sleep_words_positive(auth_client):
    start = dt.date(2026, 5, 1)
    # 5 kurze, 5 mittlere, 5 lange Naechte (Terzile bei n_total=15: 5/5/5)
    for i in range(5):
        d = (start + dt.timedelta(days=i)).isoformat()
        _put_night(auth_client, d, "unter6")
        auth_client.post("/api/dreams", json=make_dream(date=d, content=_content(50)))
    for i in range(5, 10):
        d = (start + dt.timedelta(days=i)).isoformat()
        _put_night(auth_client, d, "6bis7")
        auth_client.post("/api/dreams", json=make_dream(date=d, content=_content(999)))
    for i in range(10, 15):
        d = (start + dt.timedelta(days=i)).isoformat()
        _put_night(auth_client, d, "ueber8")
        auth_client.post("/api/dreams", json=make_dream(date=d, content=_content(65)))

    findings = _insights(auth_client)
    f = _find(findings, "sleep_words")
    assert f is not None
    assert f["text_key"] == "insights.sleepWordsMore"
    # rel = (65-50)/50 = 0.30 -> pct=30, n=5+5
    assert f["params"] == {"pct": 30, "n": 10}


def test_sleep_words_n_too_small(auth_client):
    start = dt.date(2026, 5, 1)
    # n_total=12 -> Terzile je 4 Naechte, unter MIN_N=5
    for i in range(4):
        d = (start + dt.timedelta(days=i)).isoformat()
        _put_night(auth_client, d, "unter6")
        auth_client.post("/api/dreams", json=make_dream(date=d, content=_content(50)))
    for i in range(4, 8):
        d = (start + dt.timedelta(days=i)).isoformat()
        _put_night(auth_client, d, "6bis7")
        auth_client.post("/api/dreams", json=make_dream(date=d, content=_content(999)))
    for i in range(8, 12):
        d = (start + dt.timedelta(days=i)).isoformat()
        _put_night(auth_client, d, "ueber8")
        auth_client.post("/api/dreams", json=make_dream(date=d, content=_content(65)))

    findings = _insights(auth_client)
    assert _find(findings, "sleep_words") is None


def test_sleep_words_not_available_below_nine_nights(auth_client):
    start = dt.date(2026, 5, 1)
    for i in range(8):  # < 9 Naechte insgesamt -> sleep_analysis nicht verfuegbar
        d = (start + dt.timedelta(days=i)).isoformat()
        _put_night(auth_client, d, "unter6" if i % 2 else "ueber8")
        auth_client.post("/api/dreams", json=make_dream(date=d, content=_content(50)))

    findings = _insights(auth_client)
    assert _find(findings, "sleep_words") is None


# ---- weekday ----

def test_weekday_positive(auth_client):
    # 2026-04-01, -08, -15, -22, -29 sind alle Mittwoche.
    wednesdays = [dt.date(2026, 4, d) for d in (1, 8, 15, 22, 29)]
    for d in wednesdays:
        auth_client.post("/api/dreams", json=make_dream(date=d.isoformat(), lucidity=3))
    # 10 weitere, nicht-luzide Traeume auf anderen Wochentagen (je < MIN_N).
    others = [dt.date(2026, 4, d) for d in (2, 3, 6, 7, 4)]
    for d in others:
        for offset in (0, 28):  # zweite Charge 4 Wochen spaeter, gleicher Wochentag (28 % 7 == 0)
            auth_client.post("/api/dreams", json=make_dream(
                date=(d + dt.timedelta(days=offset)).isoformat(), lucidity=1,
            ))

    findings = _insights(auth_client)
    f = _find(findings, "weekday")
    assert f is not None
    assert f["text_key"] == "insights.weekdayHigh"
    # Mi-Quote=100%, Gesamt=5/15=33% -> deviation=67pp -> pct=round(100)=100, n=5
    assert f["params"] == {"day": "wed", "pct": 100, "n": 5}


def test_weekday_n_too_small(auth_client):
    # Nur 4 Traeume je Wochentag -> kein Kandidat erreicht MIN_N=5.
    for d in (dt.date(2026, 4, 1), dt.date(2026, 4, 8), dt.date(2026, 4, 15), dt.date(2026, 4, 22)):
        auth_client.post("/api/dreams", json=make_dream(date=d.isoformat(), lucidity=3))

    findings = _insights(auth_client)
    assert _find(findings, "weekday") is None


def test_weekday_no_deviation(auth_client):
    # Alle Traeume ueberall luzide -> jeder Wochentag hat dieselbe Quote wie das Gesamtbild.
    wednesdays = [dt.date(2026, 4, d) for d in (1, 8, 15, 22, 29)]
    for d in wednesdays:
        auth_client.post("/api/dreams", json=make_dream(date=d.isoformat(), lucidity=3))
    others = [dt.date(2026, 4, d) for d in (2, 3, 6, 7, 4)]
    for d in others:
        for offset in (0, 28):
            auth_client.post("/api/dreams", json=make_dream(
                date=(d + dt.timedelta(days=offset)).isoformat(), lucidity=3,
            ))

    findings = _insights(auth_client)
    assert _find(findings, "weekday") is None


# ---- lucid_rate_change (Schlafend-Regel) ----

def test_lucid_rate_change_positive(auth_client):
    start = dt.date(2026, 3, 2)
    for i, week in enumerate(_weeks(start, 8)):
        lucid_this_week = i >= 4  # letzte 4 Wochen luzide, die 4 davor nicht
        for offset in (0, 2):
            auth_client.post("/api/dreams", json=make_dream(
                date=(week + dt.timedelta(days=offset)).isoformat(),
                lucidity=3 if lucid_this_week else 1,
            ))

    findings = _insights(auth_client)
    f = _find(findings, "lucid_rate_change")
    assert f is not None
    assert f["text_key"] == "insights.lucidRateChangeUp"
    # rate_prior=0%, rate_recent=100% -> delta=100pp -> pct=100, n=16
    assert f["params"] == {"pct": 100, "n": 16}


def test_lucid_rate_change_gated_without_any_lucid_dream(auth_client):
    start = dt.date(2026, 3, 2)
    # Gleiche Bucket-Struktur, aber NIE Luziditaet >= 3 -> Schlafend-Regel blockt.
    for i, week in enumerate(_weeks(start, 8)):
        for offset in (0, 2):
            auth_client.post("/api/dreams", json=make_dream(
                date=(week + dt.timedelta(days=offset)).isoformat(), lucidity=2,
            ))

    findings = _insights(auth_client)
    assert _find(findings, "lucid_rate_change") is None
    assert _find(findings, "beifuss") is None


def test_lucid_rate_change_below_effect_threshold(auth_client):
    start = dt.date(2026, 3, 2)
    for i, week in enumerate(_weeks(start, 8)):
        for offset, lucidity in ((0, 3), (2, 1)):  # 1 von 2/Woche luzide, konstant -> delta=0
            auth_client.post("/api/dreams", json=make_dream(
                date=(week + dt.timedelta(days=offset)).isoformat(), lucidity=lucidity,
            ))

    findings = _insights(auth_client)
    assert _find(findings, "lucid_rate_change") is None


# ---- beifuss (Schlafend-Regel) ----

def test_beifuss_positive(auth_client):
    for i in range(5):
        d = (dt.date(2026, 6, 1) + dt.timedelta(days=i)).isoformat()
        auth_client.post("/api/dreams", json=make_dream(date=d, lucidity=3, substances=["beifuss"]))
    for i in range(5, 10):
        d = (dt.date(2026, 6, 1) + dt.timedelta(days=i)).isoformat()
        auth_client.post("/api/dreams", json=make_dream(date=d, lucidity=1))

    findings = _insights(auth_client)
    f = _find(findings, "beifuss")
    assert f is not None
    assert f["text_key"] == "insights.beifussUp"
    # mit=5/5=100%, ohne=0/5=0% -> delta=100pp -> pct=100, n=10
    assert f["params"] == {"pct": 100, "n": 10}


def test_beifuss_n_too_small(auth_client):
    for i in range(4):  # nur 4 < MIN_N=5
        d = (dt.date(2026, 6, 1) + dt.timedelta(days=i)).isoformat()
        auth_client.post("/api/dreams", json=make_dream(date=d, lucidity=3, substances=["beifuss"]))
    for i in range(4, 9):
        d = (dt.date(2026, 6, 1) + dt.timedelta(days=i)).isoformat()
        auth_client.post("/api/dreams", json=make_dream(date=d, lucidity=1))

    findings = _insights(auth_client)
    assert _find(findings, "beifuss") is None


def test_beifuss_at_exact_threshold_fires(auth_client):
    for i in range(5):
        d = (dt.date(2026, 6, 1) + dt.timedelta(days=i)).isoformat()
        # 2 von 5 luzide = 40%
        auth_client.post("/api/dreams", json=make_dream(
            date=d, lucidity=3 if i < 2 else 1, substances=["beifuss"],
        ))
    for i in range(5, 10):
        d = (dt.date(2026, 6, 1) + dt.timedelta(days=i)).isoformat()
        # 1 von 5 luzide = 20% -> delta = 20pp genau an der Schwelle
        auth_client.post("/api/dreams", json=make_dream(date=d, lucidity=3 if i == 5 else 1))

    findings = _insights(auth_client)
    f = _find(findings, "beifuss")
    assert f is not None
    assert f["params"] == {"pct": 20, "n": 10}


# ---- Endpoint: Ranking, Zeitraum-Filter, Auth ----

def test_findings_ranked_by_effect_descending(auth_client):
    # Streak (Effekt=7) uebertrifft sleep_words (Effekt=0.30) deutlich.
    today = dt.date.today()
    for i in range(7):
        auth_client.post("/api/dreams", json=make_dream(date=(today - dt.timedelta(days=i)).isoformat()))

    start = dt.date(2026, 5, 1)
    for i in range(5):
        d = (start + dt.timedelta(days=i)).isoformat()
        _put_night(auth_client, d, "unter6")
        auth_client.post("/api/dreams", json=make_dream(date=d, content=_content(50)))
    for i in range(5, 10):
        d = (start + dt.timedelta(days=i)).isoformat()
        _put_night(auth_client, d, "6bis7")
        auth_client.post("/api/dreams", json=make_dream(date=d, content=_content(999)))
    for i in range(10, 15):
        d = (start + dt.timedelta(days=i)).isoformat()
        _put_night(auth_client, d, "ueber8")
        auth_client.post("/api/dreams", json=make_dream(date=d, content=_content(65)))

    findings = _insights(auth_client)
    ids = [f["id"] for f in findings]
    assert "streak" in ids and "sleep_words" in ids
    assert ids.index("streak") < ids.index("sleep_words")
    effects = [f["effect"] for f in findings]
    assert effects == sorted(effects, reverse=True)


def test_insights_respect_date_filter(auth_client):
    start = dt.date(2026, 3, 2)
    for i, week in enumerate(_weeks(start, 8)):
        words = 60 if i >= 4 else 50
        for offset in (0, 2):
            auth_client.post("/api/dreams", json=make_dream(
                date=(week + dt.timedelta(days=offset)).isoformat(),
                content=_content(words),
            ))

    assert _find(_insights(auth_client), "writing_trend") is not None
    # Filter weit ausserhalb aller Fixture-Daten -> dreams leer -> kein Finding.
    filtered = _insights(auth_client, **{"from": "2020-01-01", "to": "2020-01-31"})
    assert _find(filtered, "writing_trend") is None


def test_insights_require_authentication(client):
    resp = client.get("/api/stats/insights")
    assert resp.status_code == 401
