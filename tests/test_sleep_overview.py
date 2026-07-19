"""SS.1: Kopfzeile/Nacht-Balken/Wochentags-Rhythmus -- reine Funktionstests
gegen build_sleep_overview(), Fokus auf den Mitternachts-Übergang (zirkuläre
Mittelwerte/Streuung, s. Docstring in stats_helpers.py)."""
import datetime as dt

from models import Night
from stats_helpers import build_sleep_overview


def _night(date, bed=None, wake=None, sleep_minutes=None, confidence="exact", source="manual", **kw):
    return Night(date=date, bed_time=bed, wake_time=wake, sleep_minutes=sleep_minutes, confidence=confidence, source=source, **kw)


def test_empty_dataset():
    result = build_sleep_overview([])
    assert result["n_total"] == 0
    assert result["avg_duration_14d"] is None
    assert result["median_duration"] is None
    assert result["regularity"] is None
    assert result["night_bars"] == []
    assert result["tracker_tiles"] is None


def test_avg_duration_14d_only_counts_recent_nights():
    today = dt.date.today()
    nights = [
        _night(today - dt.timedelta(days=1), bed="23:00", wake="07:00", sleep_minutes=480),
        _night(today - dt.timedelta(days=2), bed="23:00", wake="07:00", sleep_minutes=420),
        _night(today - dt.timedelta(days=40), bed="23:00", wake="07:00", sleep_minutes=100),  # zu alt
    ]
    result = build_sleep_overview(nights)
    assert result["avg_duration_14d"] == 450  # (480+420)/2, die alte Nacht zaehlt nicht mit
    assert result["median_duration"] == 420  # Median ueber ALLE drei (100,420,480)


def test_circular_mean_across_midnight():
    # 23:00 und 01:00 sind zirkulaer nur 2h auseinander, Mittelwert ~00:00 --
    # ein naiver arithmetischer Mittelwert würde 12:00 ergeben (Unsinn).
    nights = [
        _night(dt.date(2026, 7, 6), bed="23:00", wake="07:00", sleep_minutes=480),  # Montag
        _night(dt.date(2026, 7, 13), bed="01:00", wake="07:00", sleep_minutes=360),  # Montag (Woche später)
    ]
    result = build_sleep_overview(nights)
    monday = next(d for d in result["weekday_rhythm"] if d["day"] == "Mo")
    assert monday["avg_bed_time"] == "00:00"


def test_regularity_high_for_consistent_bedtimes():
    dates = [dt.date(2026, 7, 1) + dt.timedelta(days=i) for i in range(6)]
    nights = [_night(d, bed="23:00", wake="07:00", sleep_minutes=480) for d in dates]  # exakt gleiche Zeit
    result = build_sleep_overview(nights)
    assert result["regularity"] == "regular"


def test_regularity_low_for_scattered_bedtimes():
    dates = [dt.date(2026, 7, 1) + dt.timedelta(days=i) for i in range(6)]
    bedtimes = ["20:00", "23:00", "02:00", "05:00", "12:00", "18:00"]  # ueber den ganzen Tag verteilt
    nights = [_night(d, bed=b, wake="09:00", sleep_minutes=300) for d, b in zip(dates, bedtimes)]
    result = build_sleep_overview(nights)
    assert result["regularity"] == "irregular"


def test_regularity_null_below_minimum_nights():
    dates = [dt.date(2026, 7, 1) + dt.timedelta(days=i) for i in range(3)]  # nur 3, Minimum ist 5
    nights = [_night(d, bed="23:00", wake="07:00", sleep_minutes=480) for d in dates]
    result = build_sleep_overview(nights)
    assert result["regularity"] is None


def test_night_bars_limited_to_thirty_oldest_first():
    dates = [dt.date(2026, 1, 1) + dt.timedelta(days=i) for i in range(40)]
    nights = [_night(d, bed="23:00", wake="07:00", sleep_minutes=480) for d in dates]
    result = build_sleep_overview(nights)
    bars = result["night_bars"]
    assert len(bars) == 30
    assert bars[0]["date"] < bars[-1]["date"]  # aeltest zuerst (fuers Balken-Rendering von links nach rechts)
    assert bars[-1]["date"] == dates[-1].isoformat()  # die juengste Nacht ist dabei


def test_rough_and_unknown_nights_included_in_bars_but_not_regularity():
    nights = [
        _night(dt.date(2026, 7, 1), confidence="rough", sleep_minutes=390),
        _night(dt.date(2026, 7, 2), confidence="unknown"),
    ]
    result = build_sleep_overview(nights)
    assert len(result["night_bars"]) == 2
    assert result["regularity"] is None  # keine einzige "exact"-Nacht mit bed_time


def test_tracker_tiles_absent_without_tracker_nights():
    nights = [_night(dt.date(2026, 7, 1), bed="23:00", wake="07:00", sleep_minutes=480)]
    result = build_sleep_overview(nights)
    assert result["tracker_tiles"] is None


def test_tracker_tiles_present_with_tracker_nights():
    n = _night(
        dt.date(2026, 7, 1), bed="23:00", wake="07:00", sleep_minutes=400, source="tracker",
        rem_minutes=100, deep_minutes=100, light_minutes=180, awake_minutes=20, awakenings=2,
    )
    result = build_sleep_overview([n])
    assert result["tracker_tiles"]["n_tracker_nights"] == 1
    assert result["tracker_tiles"]["avg_rem_share_pct"] == 25.0  # 100/400
    assert result["tracker_tiles"]["avg_awakenings"] == 2.0


def test_sleep_overview_key_present_in_stats_endpoint(auth_client):
    resp = auth_client.get("/api/stats")
    assert resp.status_code == 200
    assert resp.json()["sleep_overview"]["n_total"] == 0
