"""S.4 (Betriebs-Robustheit): Health-Check, globaler Exception-Handler,
automatisierte Service-Worker-Version."""
import routers.dreams as dreams_router


def test_health_check_without_token(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert len(body["version"]) > 0


def test_unhandled_exception_returns_clean_json_500(auth_client, monkeypatch):
    # Traum VOR dem Patch anlegen, sonst würde schon das POST (das ebenfalls
    # to_out aufruft) fehlschlagen statt nur das anschließende GET.
    auth_client.post("/api/dreams", json={
        "date": "2026-01-01", "title": "X", "content": "", "lucidity": 2,
        "sleep_quality": None, "beifuss": False, "big_dream": False,
        "emotions": [], "notes_analysis": None, "tags": [], "dream_signs": [],
        "places": [], "persons": [],
    })

    def boom(dream):
        raise RuntimeError("absichtlich provozierter Fehler für den Test")

    monkeypatch.setattr(dreams_router, "to_out", boom)
    resp = auth_client.get("/api/dreams")
    assert resp.status_code == 500
    assert resp.json() == {"detail": "internal_error"}


def test_service_worker_version_is_substituted(client):
    resp = client.get("/sw.js")
    assert resp.status_code == 200
    assert "application/javascript" in resp.headers["content-type"]
    assert "__VERSION__" not in resp.text
    assert "traumader-" in resp.text
