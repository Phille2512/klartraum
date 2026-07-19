"""TD.2: Adapter-Tests mit erfundenen Werten in der ECHTEN Struktur (nicht
Philipps echte Nacht -- s. UMSETZUNGSPLAN-TRACKERDATEN.md)."""
import csv
import datetime as dt
import io
import json

import pytest

from tracker_adapters import TrackerImportError, parse_mi_fitness


def _epoch(y, m, d, h, mi, offset_hours=2):
    tz = dt.timezone(dt.timedelta(hours=offset_hours))
    return int(dt.datetime(y, m, d, h, mi, tzinfo=tz).timestamp())


def _sleep_blob(
    bed_ts, asleep_ts, wake_ts,
    deep=120, light=280, rem=90, awake=15, awake_count=2,
    timezone_quarters=8, min_hr=44, avg_hr=52, max_hr=80, items=None,
):
    duration = deep + light + rem + awake
    if items is None:
        items = [{"start_time": asleep_ts, "end_time": wake_ts, "state": 3}]
    return {
        "bedtime": asleep_ts, "bed_timestamp": bed_ts,
        "wake_up_time": wake_ts, "out_bed_timestamp": wake_ts,
        "duration": duration,
        "sleep_deep_duration": deep, "sleep_light_duration": light,
        "sleep_rem_duration": rem, "sleep_awake_duration": awake,
        "awake_count": awake_count, "timezone": timezone_quarters,
        "min_hr": min_hr, "avg_hr": avg_hr, "max_hr": max_hr,
        "items": items,
    }


def _fitness_csv(rows, header=("Uid", "Sid", "Key", "Time", "Value", "UpdateTime")):
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(header)
    for key, time, value in rows:
        writer.writerow(["999", "sid", key, time, json.dumps(value) if value is not None else "", time])
    return buf.getvalue()


def _aggregated_csv(entries):
    """entries: list of (bedtime_epoch, score)"""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Uid", "Sid", "Tag", "Key", "Time", "Value", "UpdateTime"])
    for bedtime, score in entries:
        value = {"sleep_score": score, "segment_details": [{"bedtime": bedtime}]}
        writer.writerow(["999", "default", "daily_report", "sleep", bedtime, json.dumps(value), bedtime])
    return buf.getvalue()


def test_parse_basic_night():
    bed = _epoch(2026, 7, 5, 23, 15)
    asleep = _epoch(2026, 7, 5, 23, 24)
    wake = _epoch(2026, 7, 6, 7, 0)
    csv_text = _fitness_csv([("sleep", wake, _sleep_blob(bed, asleep, wake))])

    nights, nap_skips, errors = parse_mi_fitness(csv_text)
    assert nap_skips == 0
    assert errors == []
    assert len(nights) == 1
    n = nights[0]
    assert n.date == dt.date(2026, 7, 6)  # Datum des Aufwachens
    assert n.bed_time == "23:15"
    assert n.wake_time == "07:00"
    assert n.sleep_minutes == 120 + 280 + 90 + 15
    assert n.deep_minutes == 120 and n.light_minutes == 280
    assert n.rem_minutes == 90 and n.awake_minutes == 15
    assert n.awakenings == 2
    assert n.hr_min == 44 and n.hr_avg == 52 and n.hr_max == 80
    assert n.sleep_latency_minutes == 9  # 23:24 - 23:15
    stages = json.loads(n.stages_json)
    assert stages["segments"] == [{"s": asleep, "e": wake, "st": 3}]


def test_wake_date_used_even_across_midnight():
    bed = _epoch(2026, 7, 5, 23, 0)
    wake = _epoch(2026, 7, 6, 6, 30)
    csv_text = _fitness_csv([("sleep", wake, _sleep_blob(bed, bed, wake))])
    nights, _, _ = parse_mi_fitness(csv_text)
    assert nights[0].date == dt.date(2026, 7, 6)


def test_state_codes_preserved_as_is_in_segments():
    bed = _epoch(2026, 7, 5, 23, 0)
    wake = _epoch(2026, 7, 6, 7, 0)
    items = [
        {"start_time": bed, "end_time": bed + 1800, "state": 3},
        {"start_time": bed + 1800, "end_time": bed + 3600, "state": 2},
        {"start_time": bed + 3600, "end_time": bed + 5400, "state": 4},
        {"start_time": bed + 5400, "end_time": wake, "state": 5},
    ]
    csv_text = _fitness_csv([("sleep", wake, _sleep_blob(bed, bed, wake, items=items))])
    nights, _, _ = parse_mi_fitness(csv_text)
    states = [seg["st"] for seg in json.loads(nights[0].stages_json)["segments"]]
    assert states == [3, 2, 4, 5]


def test_short_daytime_session_is_treated_as_nap():
    bed = _epoch(2026, 7, 6, 14, 0)  # 14 Uhr nachmittags
    wake = _epoch(2026, 7, 6, 14, 45)
    blob = _sleep_blob(bed, bed, wake, deep=10, light=30, rem=5, awake=0, awake_count=0)
    csv_text = _fitness_csv([("sleep", wake, blob)])
    nights, nap_skips, _ = parse_mi_fitness(csv_text)
    assert nights == []
    assert nap_skips == 1


def test_short_nighttime_session_is_not_treated_as_nap():
    # Kurze, aber ECHTE Nacht (2,5h um Mitternacht) darf nicht als Nickerchen
    # rausfallen -- nur Dauer allein reicht nicht, s. Adapter-Kommentar.
    bed = _epoch(2026, 7, 6, 1, 0)
    wake = _epoch(2026, 7, 6, 3, 30)
    blob = _sleep_blob(bed, bed, wake, deep=30, light=100, rem=10, awake=10, awake_count=1)
    csv_text = _fitness_csv([("sleep", wake, blob)])
    nights, nap_skips, _ = parse_mi_fitness(csv_text)
    assert nap_skips == 0
    assert len(nights) == 1


def test_timezone_quarter_hours_not_confused_with_hours():
    # timezone=4 -> 4 * 15min = 60min = UTC+1 (nicht UTC+4!)
    bed = _epoch(2026, 7, 5, 23, 0, offset_hours=1)
    wake = _epoch(2026, 7, 6, 7, 0, offset_hours=1)
    blob = _sleep_blob(bed, bed, wake, timezone_quarters=4)
    csv_text = _fitness_csv([("sleep", wake, blob)])
    nights, _, _ = parse_mi_fitness(csv_text)
    assert nights[0].bed_time == "23:00"
    assert nights[0].wake_time == "07:00"


def test_score_joined_from_aggregated_file_by_matching_bedtime():
    bed = _epoch(2026, 7, 5, 23, 0)
    asleep = _epoch(2026, 7, 5, 23, 10)
    wake = _epoch(2026, 7, 6, 7, 0)
    fitness = _fitness_csv([("sleep", wake, _sleep_blob(bed, asleep, wake))])
    aggregated = _aggregated_csv([(asleep, 84)])

    nights, _, _ = parse_mi_fitness(fitness, aggregated)
    assert nights[0].tracker_score == 84


def test_score_is_none_without_aggregated_file():
    bed = _epoch(2026, 7, 5, 23, 0)
    wake = _epoch(2026, 7, 6, 7, 0)
    csv_text = _fitness_csv([("sleep", wake, _sleep_blob(bed, bed, wake))])
    nights, _, _ = parse_mi_fitness(csv_text)
    assert nights[0].tracker_score is None


def test_heart_rate_rows_thinned_into_stages_hr():
    bed = _epoch(2026, 7, 5, 23, 0)
    wake = _epoch(2026, 7, 6, 7, 0)
    rows = [("sleep", wake, _sleep_blob(bed, bed, wake))]
    for i in range(5):
        t = bed + i * 600
        rows.append(("heart_rate", t, {"time": t, "bpm": 50 + i}))
    csv_text = _fitness_csv(rows)
    nights, _, _ = parse_mi_fitness(csv_text)
    hr = json.loads(nights[0].stages_json)["hr"]
    assert len(hr) == 5
    assert hr[0][1] == 50


def test_bad_format_missing_columns_raises_clear_error():
    csv_text = "foo,bar\n1,2\n"
    with pytest.raises(TrackerImportError, match="tracker_import_bad_format"):
        parse_mi_fitness(csv_text)


def test_no_sleep_rows_raises_clear_error():
    csv_text = _fitness_csv([("steps", 123, {"count": 500})])
    with pytest.raises(TrackerImportError, match="tracker_import_no_sleep_data"):
        parse_mi_fitness(csv_text)


def test_malformed_sleep_row_is_a_row_error_not_fatal():
    bed = _epoch(2026, 7, 5, 23, 0)
    wake = _epoch(2026, 7, 6, 7, 0)
    good = _sleep_blob(bed, bed, wake)
    broken = {"bedtime": 123}  # fehlende Pflichtfelder
    csv_text = _fitness_csv([("sleep", wake, good), ("sleep", 999, broken)])

    nights, _, errors = parse_mi_fitness(csv_text)
    assert len(nights) == 1  # die gute Nacht kommt trotzdem durch
    assert len(errors) == 1
    assert "tracker_import_row_error" in errors[0]
