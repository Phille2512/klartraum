from test_dreams import make_dream


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
