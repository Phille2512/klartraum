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


def test_nights_require_authentication(client):
    resp = client.get("/api/nights/2026-07-14")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "not_authenticated"

    resp = client.put("/api/nights/2026-07-14", json={"unknown": True})
    assert resp.status_code == 401
