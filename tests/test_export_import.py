from test_dreams import make_dream

import datetime as dt

from database import engine
from models import Night
from sqlmodel import Session


def test_export_json(auth_client):
    auth_client.post("/api/dreams", json=make_dream(title="Export-Test", tags=["klar"]))
    resp = auth_client.get("/api/export", params={"format": "json"})
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/json")
    body = resp.json()
    assert len(body) == 1
    assert body[0]["title"] == "Export-Test"
    assert body[0]["tags"] == ["klar"]


def test_export_csv(auth_client):
    auth_client.post("/api/dreams", json=make_dream(title="CSV-Test"))
    resp = auth_client.get("/api/export", params={"format": "csv"})
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    text = resp.text
    assert "CSV-Test" in text
    header = text.splitlines()[0]
    assert "title" in header and "lucidity" in header


def test_export_includes_night_fields_when_present(auth_client):
    auth_client.put("/api/nights/2026-03-01", json={"bed_time": "23:00", "wake_time": "07:00"})
    auth_client.post("/api/dreams", json=make_dream(title="Mit Nacht", date="2026-03-01"))

    resp = auth_client.get("/api/export", params={"format": "json"})
    row = resp.json()[0]
    assert row["bed_time"] == "23:00"
    assert row["wake_time"] == "07:00"
    assert row["sleep_minutes"] == 480
    assert row["sleep_confidence"] == "exact"

    resp = auth_client.get("/api/export", params={"format": "csv"})
    header = resp.text.splitlines()[0].split(",")
    for col in ("bed_time", "wake_time", "sleep_minutes", "sleep_confidence"):
        assert col in header
    assert "23:00" in resp.text and "480" in resp.text


def test_export_includes_tracker_fields_when_present(auth_client):
    # TD.1: Tracker-Import gibt es erst in TD.2 -- Nacht hier direkt per
    # DB-Session simulieren.
    with Session(engine) as session:
        session.add(Night(
            date=dt.date(2026, 3, 3), bed_time="23:15", wake_time="06:45",
            sleep_minutes=450, confidence="exact", source="tracker",
            rem_minutes=88, deep_minutes=140, light_minutes=210, awake_minutes=12,
            awakenings=2, tracker_score=81, hr_min=44, hr_avg=52, hr_max=79,
            sleep_latency_minutes=9, stages_json='{"segments":[{"s":1,"e":2,"st":2}]}',
        ))
        session.commit()
    auth_client.post("/api/dreams", json=make_dream(title="Tracker-Nacht", date="2026-03-03"))

    resp = auth_client.get("/api/export", params={"format": "json"})
    row = resp.json()[0]
    assert row["sleep_source"] == "tracker"
    assert row["rem_minutes"] == 88
    assert row["deep_minutes"] == 140
    assert row["light_minutes"] == 210
    assert row["awake_minutes"] == 12
    assert row["awakenings"] == 2
    assert row["tracker_score"] == 81
    assert row["hr_min"] == 44 and row["hr_avg"] == 52 and row["hr_max"] == 79
    assert row["sleep_latency_minutes"] == 9
    assert row["stages_json"] == '{"segments":[{"s":1,"e":2,"st":2}]}'

    resp = auth_client.get("/api/export", params={"format": "csv"})
    header = resp.text.splitlines()[0].split(",")
    for col in (
        "sleep_source", "rem_minutes", "deep_minutes", "light_minutes", "awake_minutes",
        "awakenings", "tracker_score", "hr_min", "hr_avg", "hr_max",
        "sleep_latency_minutes", "stages_json",
    ):
        assert col in header
    assert "tracker" in resp.text and "88" in resp.text


def test_export_night_fields_empty_without_night_entry(auth_client):
    auth_client.post("/api/dreams", json=make_dream(title="Ohne Nacht", date="2026-03-02"))

    resp = auth_client.get("/api/export", params={"format": "json"})
    row = resp.json()[0]
    assert row["bed_time"] is None
    assert row["wake_time"] is None
    assert row["sleep_minutes"] is None
    assert row["sleep_confidence"] is None
    for field in ("sleep_source", "rem_minutes", "tracker_score", "stages_json"):
        assert row[field] is None


def test_export_ordered_by_date(auth_client):
    auth_client.post("/api/dreams", json=make_dream(title="Spaeter", date="2026-06-01"))
    auth_client.post("/api/dreams", json=make_dream(title="Frueher", date="2026-01-01"))
    resp = auth_client.get("/api/export", params={"format": "json"})
    titles = [d["title"] for d in resp.json()]
    assert titles == ["Frueher", "Spaeter"]


def test_datainfo_reports_counts_and_backup_fields(auth_client):
    auth_client.post("/api/dreams", json=make_dream())
    resp = auth_client.get("/api/datainfo")
    assert resp.status_code == 200
    data = resp.json()
    assert data["dream_count"] == 1
    assert "data_dir" in data
    assert "db_file" in data
    # S.1: Backup-Felder müssen immer vorhanden sein (auch wenn noch kein
    # Backup existiert, weil im Test die Datenbank frisch erzeugt wurde)
    assert "last_backup" in data
    assert "backup_count" in data
    assert "backup_dir" in data
