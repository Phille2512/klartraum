"""TD.3: Terzile/Gruppen gegen handgerechnete Fixture-Daten -- reine
Funktionstests gegen build_tracker_analysis(), kein DB/HTTP nötig."""
import datetime as dt
import json

from models import Dream, Night
from stats_helpers import build_tracker_analysis


def _night(date, rem=80, deep=100, light=250, awake=15, awakenings=1, score=None,
           source="tracker", sleep_minutes=None, latency=None, stages_json=None):
    return Night(
        date=date, confidence="exact", source=source,
        rem_minutes=rem, deep_minutes=deep, light_minutes=light, awake_minutes=awake,
        awakenings=awakenings, tracker_score=score,
        sleep_minutes=sleep_minutes if sleep_minutes is not None else rem + deep + light + awake,
        sleep_latency_minutes=latency, stages_json=stages_json,
    )


def _dream(date, words=10, lucidity=2, substances=None):
    return Dream(date=date, title="t", content=" ".join(["wort"] * words), lucidity=lucidity, substances=substances)


def _nine_dates(start=dt.date(2026, 6, 1)):
    return [start + dt.timedelta(days=i) for i in range(9)]


def test_below_nine_nights_is_unavailable():
    dates = _nine_dates()[:8]
    nights = [_night(d) for d in dates]
    result = build_tracker_analysis([], nights)
    assert result == {"available": False, "n_total": 8}


def test_manual_nights_without_phases_dont_count_toward_total():
    dates = _nine_dates()
    tracker_nights = [_night(d) for d in dates]
    manual_only = [Night(date=dt.date(2026, 5, 1), confidence="exact", source="manual", sleep_minutes=400)]
    result = build_tracker_analysis([], tracker_nights + manual_only)
    assert result["n_total"] == 9  # Mischbestand: die manuelle Nacht zählt nicht mit


def test_rem_amount_terciles_split_correctly():
    dates = _nine_dates()
    rem_values = [40, 50, 60, 70, 80, 90, 100, 110, 120]  # aufsteigend, 3er-Drittel
    nights = [_night(d, rem=r) for d, r in zip(dates, rem_values)]
    dreams = [_dream(d, words=10) for d in dates]

    result = build_tracker_analysis(dreams, nights)
    assert result["available"] is True
    assert result["rem_amount"]["wenig"]["n_nights"] == 3
    assert result["rem_amount"]["mittel"]["n_nights"] == 3
    assert result["rem_amount"]["viel"]["n_nights"] == 3
    # je ein Traum mit 10 Wörtern pro Nacht -> avg_words exakt 10 in jeder Gruppe
    assert result["rem_amount"]["wenig"]["avg_words"] == 10
    assert result["rem_amount"]["viel"]["avg_words"] == 10


def test_rem_amount_and_rem_density_are_independent():
    # Konstruiert so, dass die Rangfolge nach REM-MENGE genau umgekehrt zur
    # Rangfolge nach REM-DICHTE ist: rem = (i+1)*10, sleep = (i+1)^2*10, also
    # waechst die Gesamtschlafdauer schneller als der REM-Anteil -> hoher
    # absoluter REM-Wert bedeutet hier NIEDRIGE Dichte. Je Nacht ein Traum mit
    # (i+1)*10 Woertern als Marker, um die Gruppenzugehoerigkeit ueber
    # avg_words nachzuweisen (die Rueckgabe enthaelt keine Rohdaten je Nacht).
    dates = _nine_dates()
    nights = []
    dreams = []
    for i, d in enumerate(dates):
        rem = (i + 1) * 10
        sleep = (i + 1) ** 2 * 10
        nights.append(_night(d, rem=rem, deep=10, light=10, awake=5, sleep_minutes=sleep))
        dreams.append(_dream(d, words=rem))

    result = build_tracker_analysis(dreams, nights)
    # REM-MENGE aufsteigend = Konstruktionsreihenfolge -> "viel" sind die drei
    # größten rem-Werte (70/80/90), Ø 80 Wörter.
    assert result["rem_amount"]["viel"]["avg_words"] == 80
    # REM-DICHTE ist dazu GEGENLÄUFIG -> "viel" (Dichte) sind die drei
    # KLEINSTEN rem-Werte (10/20/30), Ø 20 Wörter -- das Gegenteil von oben.
    assert result["rem_density"]["viel"]["avg_words"] == 20


def test_awakenings_groups_boundaries():
    dates = _nine_dates()
    awakenings_values = [0, 1, 1, 2, 3, 3, 4, 5, 6]  # 3x "0-1", 3x "2-3", 3x "4+"
    nights = [_night(d, awakenings=a) for d, a in zip(dates, awakenings_values)]
    result = build_tracker_analysis([], nights)
    assert result["awakenings"]["0-1"]["n_nights"] == 3
    assert result["awakenings"]["2-3"]["n_nights"] == 3
    assert result["awakenings"]["4+"]["n_nights"] == 3


def test_wbtb_classification_uses_two_or_more_awakenings():
    dates = _nine_dates()
    awakenings_values = [0, 1, 1, 1, 2, 2, 3, 4, 5]  # 4x <2, 5x >=2
    nights = [_night(d, awakenings=a) for d, a in zip(dates, awakenings_values)]
    result = build_tracker_analysis([], nights)
    assert result["wbtb"]["durchgeschlafen"]["n_nights"] == 4
    assert result["wbtb"]["wbtb"]["n_nights"] == 5


def test_wake_moment_rem_after_is_computed_and_sorted():
    date = dt.date(2026, 6, 1)
    # Segmente: Leichtschlaf -> WACH (04:32 UTC+2) -> REM 25min -> Tiefschlaf
    bed = int(dt.datetime(2026, 6, 1, 23, 0, tzinfo=dt.timezone(dt.timedelta(hours=2))).timestamp())
    wake_evt = int(dt.datetime(2026, 6, 2, 4, 32, tzinfo=dt.timezone(dt.timedelta(hours=2))).timestamp())
    segments = [
        {"s": bed, "e": wake_evt, "st": 3},
        {"s": wake_evt, "e": wake_evt + 120, "st": 5},
        {"s": wake_evt + 120, "e": wake_evt + 120 + 25 * 60, "st": 4},  # 25 min REM danach
        {"s": wake_evt + 120 + 25 * 60, "e": wake_evt + 120 + 25 * 60 + 600, "st": 2},
    ]
    stages = json.dumps({"segments": segments, "tz_offset_minutes": 120})

    dates = _nine_dates()
    nights = [_night(d) for d in dates]
    nights[0] = _night(date, stages_json=stages)

    result = build_tracker_analysis([], nights)
    moments = result["wbtb"]["wake_moments"]
    assert len(moments) == 1
    assert moments[0]["time"] == "04:32"
    assert moments[0]["rem_after_minutes"] == 25


def test_schlafend_regel_hides_lucid_rate_without_any_lucid_dream():
    dates = _nine_dates()
    nights = [_night(d) for d in dates]
    dreams = [_dream(d, lucidity=2) for d in dates]  # kein einziger luzider Traum
    result = build_tracker_analysis(dreams, nights)
    for group in result["rem_amount"].values():
        assert group["lucid_rate"] is None


def test_schlafend_regel_shows_lucid_rate_once_any_lucid_dream_exists():
    dates = _nine_dates()
    nights = [_night(d) for d in dates]
    dreams = [_dream(d, lucidity=2) for d in dates]
    dreams[0] = _dream(dates[0], lucidity=3)  # ein einziger luzider Traum irgendwo
    result = build_tracker_analysis(dreams, nights)
    # Jetzt muss lucid_rate eine Zahl sein (kann auch 0.0 sein), nicht mehr None
    assert all(group["lucid_rate"] is not None for group in result["rem_amount"].values())


def test_calibration_only_pairs_manual_source_with_phases():
    dates = _nine_dates()
    nights = [_night(d, source="tracker") for d in dates]  # tracker_wins/fill_empty -> kein Vergleich möglich
    nights[0] = _night(dates[0], source="manual", sleep_minutes=400)  # rem+deep+light+awake=445, manuell 400
    result = build_tracker_analysis([], nights)
    pairs = result["calibration"]["pairs"]
    assert len(pairs) == 1
    assert pairs[0]["manual_minutes"] == 400
    assert pairs[0]["tracker_minutes"] == 445
    assert result["calibration"]["avg_deviation_minutes"] == -45.0


def test_tracker_score_terciles_need_own_nine_scored_nights():
    dates = _nine_dates()
    nights = [_night(d, score=None) for d in dates]
    nights[0] = _night(dates[0], score=80)  # nur 1 von 9 hat einen Score
    result = build_tracker_analysis([], nights)
    assert result["tracker_score"] is None  # unter der Neun-Schwelle für Scores


def test_tracker_score_terciles_present_with_enough_scored_nights():
    dates = _nine_dates()
    scores = [50, 55, 60, 65, 70, 75, 80, 85, 90]
    nights = [_night(d, score=s) for d, s in zip(dates, scores)]
    result = build_tracker_analysis([], nights)
    assert result["tracker_score"]["n_total"] == 9
    assert result["tracker_score"]["wenig"]["n_nights"] == 3


def test_latency_substance_split():
    dates = _nine_dates()
    nights = [_night(d, latency=10) for d in dates]
    dreams = [_dream(d, substances="beifuss" if i < 3 else None) for i, d in enumerate(dates)]
    result = build_tracker_analysis(dreams, nights)
    assert result["latency"]["avg_minutes"] == 10.0
    assert result["latency"]["with_substance"]["n"] == 3
    assert result["latency"]["without_substance"]["n"] == 6
