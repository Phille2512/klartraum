from test_dreams import make_dream


def _create_dream(auth_client, **overrides):
    return auth_client.post("/api/dreams", json=make_dream(**overrides)).json()["id"]


def test_reflections_lifecycle(auth_client):
    dream_id = _create_dream(auth_client)
    assert auth_client.get(f"/api/dreams/{dream_id}/reflections").json() == []

    resp = auth_client.post(
        f"/api/dreams/{dream_id}/reflections",
        json={"question": "Was fühlst du?", "answer": "Ruhe"},
    )
    assert resp.status_code == 201
    ref_id = resp.json()["id"]

    resp = auth_client.get(f"/api/dreams/{dream_id}/reflections")
    assert len(resp.json()) == 1

    resp = auth_client.delete(f"/api/reflections/{ref_id}")
    assert resp.status_code == 204
    assert auth_client.get(f"/api/dreams/{dream_id}/reflections").json() == []


def test_reflection_on_missing_dream_returns_404(auth_client):
    resp = auth_client.post(
        "/api/dreams/999999/reflections", json={"question": "?", "answer": "x"}
    )
    assert resp.status_code == 404


def test_delete_missing_reflection_returns_404(auth_client):
    resp = auth_client.delete("/api/reflections/999999")
    assert resp.status_code == 404


def test_imaginations_lifecycle(auth_client):
    dream_id = _create_dream(auth_client)
    resp = auth_client.post(f"/api/dreams/{dream_id}/imaginations", json={"text": "Ich rede mit der Figur"})
    assert resp.status_code == 201
    img_id = resp.json()["id"]

    assert len(auth_client.get(f"/api/dreams/{dream_id}/imaginations").json()) == 1

    resp = auth_client.delete(f"/api/imaginations/{img_id}")
    assert resp.status_code == 204
    assert auth_client.get(f"/api/dreams/{dream_id}/imaginations").json() == []


def test_imagination_on_missing_dream_returns_404(auth_client):
    resp = auth_client.post("/api/dreams/999999/imaginations", json={"text": "x"})
    assert resp.status_code == 404


def test_dream_analysis_create_and_upsert(auth_client):
    dream_id = _create_dream(auth_client)
    resp = auth_client.post(
        f"/api/dreams/{dream_id}/analysis", json={"station": "schatten", "answer": "erste Antwort"}
    )
    assert resp.status_code == 201
    entry_id = resp.json()["id"]

    # Erneutes Posten derselben Station überschreibt statt zu duplizieren
    resp = auth_client.post(
        f"/api/dreams/{dream_id}/analysis", json={"station": "schatten", "answer": "zweite Antwort"}
    )
    assert resp.status_code == 201
    assert resp.json()["id"] == entry_id
    assert resp.json()["answer"] == "zweite Antwort"

    entries = auth_client.get(f"/api/dreams/{dream_id}/analysis").json()
    assert len(entries) == 1


def test_dream_analysis_unknown_station_returns_422(auth_client):
    dream_id = _create_dream(auth_client)
    resp = auth_client.post(
        f"/api/dreams/{dream_id}/analysis", json={"station": "unbekannt", "answer": "x"}
    )
    assert resp.status_code == 422


def test_delete_dream_analysis(auth_client):
    dream_id = _create_dream(auth_client)
    resp = auth_client.post(
        f"/api/dreams/{dream_id}/analysis", json={"station": "kompensation", "answer": "x"}
    )
    entry_id = resp.json()["id"]
    resp = auth_client.delete(f"/api/dream-analysis/{entry_id}")
    assert resp.status_code == 204
    assert auth_client.get(f"/api/dreams/{dream_id}/analysis").json() == []


def test_sync_events_lifecycle(auth_client):
    dream_id = _create_dream(auth_client)
    resp = auth_client.post(
        "/api/sync-events",
        json={"dream_id": dream_id, "date": "2026-01-06", "text": "Zufällige Begegnung"},
    )
    assert resp.status_code == 201
    event_id = resp.json()["id"]

    events = auth_client.get("/api/sync-events").json()
    assert len(events) == 1

    resp = auth_client.delete(f"/api/sync-events/{event_id}")
    assert resp.status_code == 204
    assert auth_client.get("/api/sync-events").json() == []


def test_sync_event_without_dream_id_allowed(auth_client):
    resp = auth_client.post(
        "/api/sync-events", json={"dream_id": None, "date": "2026-01-06", "text": "Ohne Bezug"}
    )
    assert resp.status_code == 201


def test_sync_event_with_missing_dream_returns_404(auth_client):
    resp = auth_client.post(
        "/api/sync-events", json={"dream_id": 999999, "date": "2026-01-06", "text": "x"}
    )
    assert resp.status_code == 404


def test_innenwelt_lists_persons_with_dreams(auth_client):
    _create_dream(auth_client, persons=["mama"], emotions=["freude"])
    resp = auth_client.get("/api/innenwelt")
    assert resp.status_code == 200
    entry = next(e for e in resp.json() if e["name"] == "mama")
    assert entry["count"] == 1
    assert entry["emotions"] == {"freude": 1}


def test_mandala_returns_dream_data(auth_client):
    _create_dream(auth_client, emotions=["freude"], places=["zuhause"])
    resp = auth_client.get("/api/mandala")
    assert resp.status_code == 200
    data = resp.json()
    assert data["days"] == 1
    assert data["emotion_totals"] == {"freude": 1}
