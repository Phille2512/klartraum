import datetime as dt

from database import engine
from models import Night
from sqlmodel import Session


def test_night_not_found_initially(auth_client):
    resp = auth_client.get("/api/nights/2026-07-14")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "night_not_found"


def test_exact_night_across_midnight(auth_client):
    resp = auth_client.put(
        "/api/nights/2026-07-14",
        json={"bed_time": "23:30", "wake_time": "07:00"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["confidence"] == "exact"
    assert body["sleep_minutes"] == 450  # 7,5h über Mitternacht


def test_exact_night_without_midnight_crossing(auth_client):
    resp = auth_client.put(
        "/api/nights/2026-07-14",
        json={"bed_time": "01:00", "wake_time": "08:00"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["sleep_minutes"] == 420  # 7h, kein Übergang


def test_rough_bucket_midpoints(auth_client):
    expected = {"unter6": 330, "6bis7": 390, "7bis8": 450, "ueber8": 510}
    for i, (bucket, minutes) in enumerate(expected.items()):
        date = f"2026-07-{10 + i:02d}"
        resp = auth_client.put(f"/api/nights/{date}", json={"bucket": bucket})
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["confidence"] == "rough"
        assert body["sleep_minutes"] == minutes
        assert body["bed_time"] is None
        assert body["wake_time"] is None


def test_unknown_night_has_no_sleep_minutes(auth_client):
    resp = auth_client.put("/api/nights/2026-07-14", json={"unknown": True})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["confidence"] == "unknown"
    assert body["sleep_minutes"] is None


def test_no_mode_selected_is_rejected(auth_client):
    resp = auth_client.put("/api/nights/2026-07-14", json={})
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_night_payload"


def test_multiple_modes_at_once_is_rejected(auth_client):
    resp = auth_client.put(
        "/api/nights/2026-07-14",
        json={"bed_time": "23:00", "wake_time": "07:00", "bucket": "7bis8"},
    )
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_night_payload"


def test_incomplete_exact_time_is_rejected(auth_client):
    resp = auth_client.put("/api/nights/2026-07-14", json={"bed_time": "23:00"})
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_night_payload"


def test_time_must_be_on_15_minute_grid(auth_client):
    resp = auth_client.put(
        "/api/nights/2026-07-14",
        json={"bed_time": "23:07", "wake_time": "07:00"},
    )
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_night_payload"


def test_invalid_bucket_value_is_rejected(auth_client):
    resp = auth_client.put("/api/nights/2026-07-14", json={"bucket": "irgendwas"})
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_night_payload"


def test_upsert_overwrites_previous_mode(auth_client):
    auth_client.put("/api/nights/2026-07-14", json={"bucket": "unter6"})
    resp = auth_client.put(
        "/api/nights/2026-07-14",
        json={"bed_time": "23:00", "wake_time": "07:00"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["confidence"] == "exact"
    assert body["sleep_minutes"] == 480


def test_delete_night_returns_to_empty(auth_client):
    auth_client.put("/api/nights/2026-07-14", json={"unknown": True})
    resp = auth_client.delete("/api/nights/2026-07-14")
    assert resp.status_code == 204

    resp = auth_client.get("/api/nights/2026-07-14")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "night_not_found"


def test_delete_missing_night_is_noop(auth_client):
    resp = auth_client.delete("/api/nights/2026-07-14")
    assert resp.status_code == 204


def test_latest_exact_night_is_null_when_none_recorded(auth_client):
    resp = auth_client.get("/api/nights/latest-exact")
    assert resp.status_code == 200
    assert resp.json() is None


def test_latest_exact_night_ignores_rough_and_unknown(auth_client):
    auth_client.put("/api/nights/2026-07-10", json={"bed_time": "23:00", "wake_time": "07:00"})
    auth_client.put("/api/nights/2026-07-12", json={"bucket": "7bis8"})
    auth_client.put("/api/nights/2026-07-13", json={"unknown": True})

    resp = auth_client.get("/api/nights/latest-exact")
    assert resp.status_code == 200
    assert resp.json()["date"] == "2026-07-10"


def test_latest_exact_night_returns_most_recent_date(auth_client):
    auth_client.put("/api/nights/2026-07-01", json={"bed_time": "23:00", "wake_time": "07:00"})
    auth_client.put("/api/nights/2026-07-14", json={"bed_time": "22:30", "wake_time": "06:30"})

    resp = auth_client.get("/api/nights/latest-exact")
    assert resp.json()["date"] == "2026-07-14"


def test_median_bedtime_is_null_without_exact_nights(auth_client):
    resp = auth_client.get("/api/nights/median-bedtime")
    assert resp.status_code == 200
    assert resp.json() is None

    auth_client.put("/api/nights/2026-07-10", json={"bucket": "7bis8"})
    auth_client.put("/api/nights/2026-07-11", json={"unknown": True})
    resp = auth_client.get("/api/nights/median-bedtime")
    assert resp.json() is None


def test_median_bedtime_odd_count(auth_client):
    for date, bed in [("2026-07-01", "22:00"), ("2026-07-02", "23:00"), ("2026-07-03", "22:30")]:
        auth_client.put(f"/api/nights/{date}", json={"bed_time": bed, "wake_time": "07:00"})

    resp = auth_client.get("/api/nights/median-bedtime")
    assert resp.json()["bed_time"] == "22:30"


def test_median_bedtime_sorts_numerically_not_by_clock_wraparound(auth_client):
    # Bewusste Vereinfachung (s. Kommentar im Router): "00:00" ist numerisch
    # die kleinste Minutenzahl, wird also wie die früheste Zeit behandelt --
    # nicht wie eine Zeit "nach Mitternacht, später als 23:00".
    for date, bed in [("2026-07-01", "22:00"), ("2026-07-02", "23:00"), ("2026-07-03", "00:00")]:
        auth_client.put(f"/api/nights/{date}", json={"bed_time": bed, "wake_time": "07:00"})

    resp = auth_client.get("/api/nights/median-bedtime")
    assert resp.json()["bed_time"] == "22:00"


def test_median_bedtime_even_count_averages_middle_two(auth_client):
    for date, bed in [("2026-07-01", "22:00"), ("2026-07-02", "23:00")]:
        auth_client.put(f"/api/nights/{date}", json={"bed_time": bed, "wake_time": "07:00"})

    resp = auth_client.get("/api/nights/median-bedtime")
    assert resp.json()["bed_time"] == "22:30"


def test_new_night_defaults_to_manual_source_and_null_tracker_fields(auth_client):
    resp = auth_client.put("/api/nights/2026-07-14", json={"bed_time": "23:00", "wake_time": "07:00"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["source"] == "manual"
    for field in (
        "rem_minutes", "deep_minutes", "light_minutes", "awake_minutes", "awakenings",
        "tracker_score", "hr_min", "hr_avg", "hr_max", "sleep_latency_minutes", "stages",
    ):
        assert body[field] is None


def test_manual_edit_resets_source_but_keeps_tracker_phases(auth_client):
    # TD.1: Eine per Tracker befüllte Nacht simulieren (TD.2-Import existiert
    # hier noch nicht) -- direkt über die DB-Session, wie es der spätere
    # Import-Endpunkt tun wird.
    with Session(engine) as session:
        session.add(Night(
            date=dt.date(2026, 7, 14), bed_time="23:00", wake_time="07:00",
            sleep_minutes=480, confidence="exact", source="tracker",
            rem_minutes=90, deep_minutes=120, light_minutes=250, awake_minutes=20,
            awakenings=3, tracker_score=78,
        ))
        session.commit()

    resp = auth_client.put("/api/nights/2026-07-14", json={"bed_time": "22:30", "wake_time": "06:30"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["source"] == "manual"  # zurückgesetzt
    assert body["bed_time"] == "22:30"  # Zeiten wurden überschrieben
    # Phasen-Felder bleiben stehen, da das PUT sie gar nicht anfasst:
    assert body["rem_minutes"] == 90
    assert body["deep_minutes"] == 120
    assert body["tracker_score"] == 78


# ---- SS.2: GET /api/nights (Liste) + GET /api/nights/medians ----

def test_list_nights_empty(auth_client):
    resp = auth_client.get("/api/nights")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_nights_sorted_newest_first(auth_client):
    auth_client.put("/api/nights/2026-07-01", json={"bed_time": "23:00", "wake_time": "07:00"})
    auth_client.put("/api/nights/2026-07-10", json={"bed_time": "23:00", "wake_time": "07:00"})
    auth_client.put("/api/nights/2026-07-05", json={"bed_time": "23:00", "wake_time": "07:00"})
    resp = auth_client.get("/api/nights")
    dates = [n["date"] for n in resp.json()]
    assert dates == ["2026-07-10", "2026-07-05", "2026-07-01"]


def test_list_nights_flags_stages_without_including_raw_json(auth_client):
    with Session(engine) as session:
        session.add(Night(
            date=dt.date(2026, 7, 6), confidence="exact", source="tracker",
            stages_json='{"segments":[{"s":1,"e":2,"st":2}]}',
        ))
        session.commit()
    resp = auth_client.get("/api/nights")
    row = resp.json()[0]
    assert row["has_stages"] is True
    assert "stages_json" not in row
    assert "stages" not in row


def test_list_nights_respects_limit(auth_client):
    for i in range(5):
        auth_client.put(f"/api/nights/2026-07-{i + 1:02d}", json={"unknown": True})
    resp = auth_client.get("/api/nights", params={"limit": 2})
    assert len(resp.json()) == 2


def test_medians_empty_without_tracker_nights(auth_client):
    auth_client.put("/api/nights/2026-07-01", json={"bed_time": "23:00", "wake_time": "07:00"})
    resp = auth_client.get("/api/nights/medians")
    assert resp.status_code == 200
    body = resp.json()
    assert body["n_total"] == 0
    assert body["rem_minutes"] is None


def test_medians_computed_from_tracker_nights_only(auth_client):
    with Session(engine) as session:
        for i, rem in enumerate([60, 80, 100]):  # Median = 80
            session.add(Night(
                date=dt.date(2026, 7, 1 + i), confidence="exact", source="tracker",
                rem_minutes=rem, deep_minutes=100, light_minutes=200, awake_minutes=10,
            ))
        session.add(Night(date=dt.date(2026, 8, 1), confidence="exact", source="manual", sleep_minutes=400))
        session.commit()
    resp = auth_client.get("/api/nights/medians")
    body = resp.json()
    assert body["n_total"] == 3  # die manuelle Nacht zaehlt nicht mit
    assert body["rem_minutes"] == 80
    assert body["deep_minutes"] == 100


def test_nights_list_and_medians_require_authentication(client):
    assert client.get("/api/nights").status_code == 401
    assert client.get("/api/nights/medians").status_code == 401


def test_nights_require_authentication(client):
    resp = client.get("/api/nights/2026-07-14")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "not_authenticated"

    resp = client.put("/api/nights/2026-07-14", json={"unknown": True})
    assert resp.status_code == 401
