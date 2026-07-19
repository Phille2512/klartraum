"""TD.2: POST /api/nights/import -- Merge-Logik der drei Überschreib-Modi,
Idempotenz, Fehlerfälle. Adapter-Parsing selbst ist in
test_tracker_adapters.py separat getestet."""
from test_tracker_adapters import _aggregated_csv, _epoch, _fitness_csv, _sleep_blob


def _upload(client, csv_text, adapter="mi_fitness", overwrite_mode=None, score_csv=None):
    data = {"adapter": adapter}
    if overwrite_mode is not None:
        data["overwrite_mode"] = overwrite_mode
    files = {"file": ("fitness_data.csv", csv_text, "text/csv")}
    if score_csv is not None:
        files["score_file"] = ("aggregated_data.csv", score_csv, "text/csv")
    return client.post("/api/nights/import", data=data, files=files)


def _one_night_csv(date_wake=(2026, 7, 6, 7, 0), date_bed=(2026, 7, 5, 23, 0)):
    bed = _epoch(*date_bed)
    wake = _epoch(*date_wake)
    return _fitness_csv([("sleep", wake, _sleep_blob(bed, bed, wake))])


def test_import_requires_authentication(client):
    resp = _upload(client, _one_night_csv())
    assert resp.status_code == 401


def test_import_unknown_adapter_rejected(auth_client):
    resp = _upload(auth_client, _one_night_csv(), adapter="does_not_exist")
    assert resp.status_code == 422
    assert resp.json()["detail"] == "unknown_adapter"


def test_import_invalid_overwrite_mode_rejected(auth_client):
    resp = _upload(auth_client, _one_night_csv(), overwrite_mode="whatever")
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_overwrite_mode"


def test_import_bad_file_returns_clear_error_code(auth_client):
    resp = _upload(auth_client, "not,a,tracker,file\n1,2,3,4\n")
    assert resp.status_code == 422
    assert resp.json()["detail"] == "tracker_import_bad_format"


def test_import_creates_new_night_with_default_fill_empty_mode(auth_client):
    resp = _upload(auth_client, _one_night_csv())
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body == {"imported": 1, "updated": 0, "skipped": 0, "errors": []}

    night = auth_client.get("/api/nights/2026-07-06").json()
    assert night["source"] == "tracker"
    assert night["confidence"] == "exact"
    assert night["bed_time"] == "23:00"
    assert night["deep_minutes"] == 120


def test_import_fill_empty_skips_night_with_existing_manual_times(auth_client):
    auth_client.put("/api/nights/2026-07-06", json={"bed_time": "22:00", "wake_time": "06:00"})
    resp = _upload(auth_client, _one_night_csv())
    assert resp.status_code == 200
    assert resp.json() == {"imported": 0, "updated": 0, "skipped": 1, "errors": []}

    night = auth_client.get("/api/nights/2026-07-06").json()
    assert night["bed_time"] == "22:00"  # unangetastet
    assert night["source"] == "manual"
    assert night["deep_minutes"] is None  # kein Tracker-Import passiert


def test_import_fill_empty_fills_rough_night_without_real_times(auth_client):
    # Grob-Nacht hat KEINE echten Zeiten (bed_time/wake_time sind None) --
    # zählt als "leer" und wird gefüllt.
    auth_client.put("/api/nights/2026-07-06", json={"bucket": "7bis8"})
    resp = _upload(auth_client, _one_night_csv())
    assert resp.json() == {"imported": 0, "updated": 1, "skipped": 0, "errors": []}

    night = auth_client.get("/api/nights/2026-07-06").json()
    assert night["bed_time"] == "23:00"
    assert night["source"] == "tracker"


def test_import_tracker_wins_overwrites_existing_manual_times(auth_client):
    auth_client.put("/api/nights/2026-07-06", json={"bed_time": "22:00", "wake_time": "06:00"})
    resp = _upload(auth_client, _one_night_csv(), overwrite_mode="tracker_wins")
    assert resp.json() == {"imported": 0, "updated": 1, "skipped": 0, "errors": []}

    night = auth_client.get("/api/nights/2026-07-06").json()
    assert night["bed_time"] == "23:00"
    assert night["source"] == "tracker"


def test_import_phases_only_leaves_times_and_source_untouched(auth_client):
    auth_client.put("/api/nights/2026-07-06", json={"bed_time": "22:00", "wake_time": "06:00"})
    resp = _upload(auth_client, _one_night_csv(), overwrite_mode="phases_only")
    assert resp.json() == {"imported": 0, "updated": 1, "skipped": 0, "errors": []}

    night = auth_client.get("/api/nights/2026-07-06").json()
    assert night["bed_time"] == "22:00"  # von phases_only nicht angefasst
    assert night["source"] == "manual"  # bleibt manual, s. Plan-Begründung
    assert night["deep_minutes"] == 120  # Phasen kommen trotzdem rein


def test_import_phases_only_creates_night_without_times_if_none_exists(auth_client):
    resp = _upload(auth_client, _one_night_csv(), overwrite_mode="phases_only")
    assert resp.json()["imported"] == 1

    night = auth_client.get("/api/nights/2026-07-06").json()
    assert night["bed_time"] is None
    assert night["deep_minutes"] == 120


def test_import_is_idempotent_with_default_mode(auth_client):
    csv_text = _one_night_csv()
    first = _upload(auth_client, csv_text)
    assert first.json()["imported"] == 1

    second = _upload(auth_client, csv_text)
    assert second.json() == {"imported": 0, "updated": 0, "skipped": 1, "errors": []}


def test_import_counts_naps_as_skipped(auth_client):
    nap_bed = _epoch(2026, 7, 6, 14, 0)
    nap_wake = _epoch(2026, 7, 6, 14, 30)
    csv_text = _fitness_csv([("sleep", nap_wake, _sleep_blob(nap_bed, nap_bed, nap_wake, deep=5, light=20, rem=0, awake=0, awake_count=0))])
    resp = _upload(auth_client, csv_text)
    assert resp.json() == {"imported": 0, "updated": 0, "skipped": 1, "errors": []}


def test_import_uses_score_file_when_provided(auth_client):
    bed = _epoch(2026, 7, 5, 23, 0)
    wake = _epoch(2026, 7, 6, 7, 0)
    fitness = _fitness_csv([("sleep", wake, _sleep_blob(bed, bed, wake))])
    score = _aggregated_csv([(bed, 77)])
    resp = _upload(auth_client, fitness, score_csv=score)
    assert resp.status_code == 200

    night = auth_client.get("/api/nights/2026-07-06").json()
    assert night["tracker_score"] == 77
