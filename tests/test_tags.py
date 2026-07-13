import datetime as dt

from test_dreams import make_dream


def test_list_tags_counts_and_sorted_by_frequency(auth_client):
    auth_client.post("/api/dreams", json=make_dream(dream_signs=["fliegen"]))
    auth_client.post("/api/dreams", json=make_dream(dream_signs=["fliegen", "zaehne"]))
    resp = auth_client.get("/api/tags")
    tags = {t["name"]: t for t in resp.json()}
    assert tags["fliegen"]["count"] == 2
    assert tags["zaehne"]["count"] == 1
    names_in_order = [t["name"] for t in resp.json()]
    assert names_in_order.index("fliegen") < names_in_order.index("zaehne")


def test_tag_names_are_normalized_lowercase(auth_client):
    auth_client.post("/api/dreams", json=make_dream(tags=["  Klar  "]))
    resp = auth_client.get("/api/tags")
    names = [t["name"] for t in resp.json()]
    assert "klar" in names
    assert "  Klar  " not in names


def test_set_tag_category_on_dream_sign(auth_client):
    auth_client.post("/api/dreams", json=make_dream(dream_signs=["fliegen"]))
    tag_id = next(t["id"] for t in auth_client.get("/api/tags").json() if t["name"] == "fliegen")
    resp = auth_client.put(f"/api/tags/{tag_id}/category", json={"category": "action"})
    assert resp.status_code == 200
    assert resp.json()["category"] == "action"


def test_set_tag_category_on_non_dream_sign_returns_400(auth_client):
    auth_client.post("/api/dreams", json=make_dream(tags=["irgendwas"]))
    tag_id = next(t["id"] for t in auth_client.get("/api/tags").json() if t["name"] == "irgendwas")
    resp = auth_client.put(f"/api/tags/{tag_id}/category", json={"category": "action"})
    assert resp.status_code == 400


def test_set_tag_category_invalid_value_returns_422(auth_client):
    auth_client.post("/api/dreams", json=make_dream(dream_signs=["fliegen"]))
    tag_id = next(t["id"] for t in auth_client.get("/api/tags").json() if t["name"] == "fliegen")
    resp = auth_client.put(f"/api/tags/{tag_id}/category", json={"category": "quatsch"})
    assert resp.status_code == 422


def test_set_tag_category_missing_tag_returns_404(auth_client):
    resp = auth_client.put("/api/tags/999999/category", json={"category": "action"})
    assert resp.status_code == 404


def test_set_archetype_on_person(auth_client):
    auth_client.post("/api/dreams", json=make_dream(persons=["mama"]))
    tag_id = next(t["id"] for t in auth_client.get("/api/tags").json() if t["name"] == "mama")
    resp = auth_client.put(f"/api/tags/{tag_id}/archetype", json={"archetype": "grosse_mutter"})
    assert resp.status_code == 200
    assert resp.json()["archetype"] == "grosse_mutter"


def test_set_archetype_on_non_person_returns_400(auth_client):
    """Archetyp auf Nicht-Person → 400 (Pflichttestfall aus dem Plan)."""
    auth_client.post("/api/dreams", json=make_dream(places=["zuhause"]))
    tag_id = next(t["id"] for t in auth_client.get("/api/tags").json() if t["name"] == "zuhause")
    resp = auth_client.put(f"/api/tags/{tag_id}/archetype", json={"archetype": "schatten"})
    assert resp.status_code == 400


def test_set_archetype_unknown_value_returns_422(auth_client):
    auth_client.post("/api/dreams", json=make_dream(persons=["papa"]))
    tag_id = next(t["id"] for t in auth_client.get("/api/tags").json() if t["name"] == "papa")
    resp = auth_client.put(f"/api/tags/{tag_id}/archetype", json={"archetype": "unbekannt"})
    assert resp.status_code == 422


def test_symbol_notes_lifecycle(auth_client):
    auth_client.post("/api/dreams", json=make_dream(dream_signs=["fliegen"]))
    tag_id = next(t["id"] for t in auth_client.get("/api/tags").json() if t["name"] == "fliegen")

    resp = auth_client.get(f"/api/tags/{tag_id}/notes")
    assert resp.json() == []

    resp = auth_client.post(f"/api/tags/{tag_id}/notes", json={"text": "erinnert an Kindheit"})
    assert resp.status_code == 201
    note_id = resp.json()["id"]

    resp = auth_client.get(f"/api/tags/{tag_id}/notes")
    assert len(resp.json()) == 1

    resp = auth_client.delete(f"/api/symbol-notes/{note_id}")
    assert resp.status_code == 204
    assert auth_client.get(f"/api/tags/{tag_id}/notes").json() == []


def test_symbol_note_on_plain_tag_returns_400(auth_client):
    auth_client.post("/api/dreams", json=make_dream(tags=["irgendwas"]))
    tag_id = next(t["id"] for t in auth_client.get("/api/tags").json() if t["name"] == "irgendwas")
    resp = auth_client.post(f"/api/tags/{tag_id}/notes", json={"text": "notiz"})
    assert resp.status_code == 400
