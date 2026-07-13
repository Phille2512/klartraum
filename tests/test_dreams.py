import datetime as dt


def make_dream(**overrides):
    payload = {
        "date": dt.date.today().isoformat(),
        "title": "TEST-Traum",
        "content": "Ein Inhalt",
        "lucidity": 2,
        "sleep_quality": None,
        "substances": [],
        "substance_other": None,
        "big_dream": False,
        "emotions": [],
        "notes_analysis": None,
        "tags": [],
        "dream_signs": [],
        "places": [],
        "persons": [],
    }
    payload.update(overrides)
    return payload


def test_create_and_get_dream(auth_client):
    resp = auth_client.post("/api/dreams", json=make_dream(title="Erster Traum"))
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Erster Traum"
    assert body["id"] > 0

    resp = auth_client.get(f"/api/dreams/{body['id']}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Erster Traum"


def test_get_missing_dream_returns_404(auth_client):
    resp = auth_client.get("/api/dreams/999999")
    assert resp.status_code == 404


def test_list_dreams_ordered_by_date_desc(auth_client):
    auth_client.post("/api/dreams", json=make_dream(title="Alt", date="2026-01-01"))
    auth_client.post("/api/dreams", json=make_dream(title="Neu", date="2026-06-01"))
    resp = auth_client.get("/api/dreams")
    titles = [d["title"] for d in resp.json()]
    assert titles == ["Neu", "Alt"]


def test_list_dreams_search(auth_client):
    auth_client.post("/api/dreams", json=make_dream(title="Fliegen über Berlin"))
    auth_client.post("/api/dreams", json=make_dream(title="Schwimmen im See"))
    resp = auth_client.get("/api/dreams", params={"search": "Berlin"})
    titles = [d["title"] for d in resp.json()]
    assert titles == ["Fliegen über Berlin"]


def test_list_dreams_date_range_filter(auth_client):
    auth_client.post("/api/dreams", json=make_dream(title="Januar", date="2026-01-15"))
    auth_client.post("/api/dreams", json=make_dream(title="Juni", date="2026-06-15"))
    resp = auth_client.get("/api/dreams", params={"from": "2026-05-01", "to": "2026-12-31"})
    titles = [d["title"] for d in resp.json()]
    assert titles == ["Juni"]


def test_list_dreams_filter_by_tag(auth_client):
    auth_client.post("/api/dreams", json=make_dream(title="Mit Zeichen", dream_signs=["fliegen"]))
    auth_client.post("/api/dreams", json=make_dream(title="Ohne Zeichen"))
    resp = auth_client.get("/api/dreams", params={"tag": "fliegen"})
    titles = [d["title"] for d in resp.json()]
    assert titles == ["Mit Zeichen"]


def test_phenomena_flags_roundtrip(auth_client):
    resp = auth_client.post("/api/dreams", json=make_dream(
        title="Phänomene",
        falsches_erwachen=True,
        schlafparalyse=True,
        traum_im_traum=False,
        wiederkehrend=True,
        albtraum=False,
    ))
    assert resp.status_code == 201
    body = resp.json()
    assert body["falsches_erwachen"] is True
    assert body["schlafparalyse"] is True
    assert body["traum_im_traum"] is False
    assert body["wiederkehrend"] is True
    assert body["albtraum"] is False

    resp = auth_client.get(f"/api/dreams/{body['id']}")
    assert resp.json()["schlafparalyse"] is True


def test_phenomena_flags_default_false(auth_client):
    resp = auth_client.post("/api/dreams", json=make_dream(title="Ohne Phänomene"))
    body = resp.json()
    for field in ("falsches_erwachen", "schlafparalyse", "traum_im_traum", "wiederkehrend", "albtraum"):
        assert body[field] is False


def test_substances_roundtrip(auth_client):
    resp = auth_client.post("/api/dreams", json=make_dream(
        title="Substanzen",
        substances=["beifuss", "melatonin"],
        substance_other="Baldrian",
    ))
    assert resp.status_code == 201
    body = resp.json()
    assert sorted(body["substances"]) == ["beifuss", "melatonin"]
    assert body["substance_other"] == "Baldrian"

    resp = auth_client.get(f"/api/dreams/{body['id']}")
    assert sorted(resp.json()["substances"]) == ["beifuss", "melatonin"]


def test_substances_default_empty(auth_client):
    resp = auth_client.post("/api/dreams", json=make_dream(title="Ohne Substanzen"))
    body = resp.json()
    assert body["substances"] == []
    assert body["substance_other"] is None


def test_list_dreams_filter_by_big_dream(auth_client):
    auth_client.post("/api/dreams", json=make_dream(title="Gross", big_dream=True))
    auth_client.post("/api/dreams", json=make_dream(title="Normal", big_dream=False))
    resp = auth_client.get("/api/dreams", params={"big_dream": "true"})
    titles = [d["title"] for d in resp.json()]
    assert titles == ["Gross"]


def test_list_dreams_filter_by_emotion(auth_client):
    auth_client.post("/api/dreams", json=make_dream(title="Angst", emotions=["angst"]))
    auth_client.post("/api/dreams", json=make_dream(title="Freude", emotions=["freude"]))
    auth_client.post("/api/dreams", json=make_dream(title="Beides", emotions=["angst", "freude"]))
    resp = auth_client.get("/api/dreams", params={"emotion": "angst"})
    titles = sorted(d["title"] for d in resp.json())
    assert titles == ["Angst", "Beides"]


def test_list_dreams_filter_combination(auth_client):
    auth_client.post("/api/dreams", json=make_dream(title="Treffer", big_dream=True, emotions=["angst"], dream_signs=["fliegen"]))
    auth_client.post("/api/dreams", json=make_dream(title="Fast", big_dream=True, emotions=["angst"]))
    resp = auth_client.get("/api/dreams", params={"big_dream": "true", "emotion": "angst", "tag": "fliegen"})
    titles = [d["title"] for d in resp.json()]
    assert titles == ["Treffer"]


def test_regression_update_with_places_persons_emotions_returns_200(auth_client):
    """Historischer 500er-Bug: places/persons/emotions gehören nicht zum
    Dream-Modell und müssen beim model_dump ausgeklammert werden."""
    resp = auth_client.post("/api/dreams", json=make_dream(title="Ursprung"))
    dream_id = resp.json()["id"]

    update_payload = make_dream(
        title="Aktualisiert",
        places=["zuhause", "schule"],
        persons=["mama", "ein freund"],
        emotions=["freude", "angst"],
        tags=["klar"],
        dream_signs=["fliegen"],
    )
    resp = auth_client.put(f"/api/dreams/{dream_id}", json=update_payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Aktualisiert"
    assert sorted(body["places"]) == ["schule", "zuhause"]
    assert sorted(body["persons"]) == ["ein freund", "mama"]
    assert sorted(body["emotions"]) == ["angst", "freude"]
    assert body["tags"] == ["klar"]
    assert body["dream_signs"] == ["fliegen"]


def test_update_missing_dream_returns_404(auth_client):
    resp = auth_client.put("/api/dreams/999999", json=make_dream())
    assert resp.status_code == 404


def test_delete_dream(auth_client):
    resp = auth_client.post("/api/dreams", json=make_dream())
    dream_id = resp.json()["id"]
    resp = auth_client.delete(f"/api/dreams/{dream_id}")
    assert resp.status_code == 204
    resp = auth_client.get(f"/api/dreams/{dream_id}")
    assert resp.status_code == 404


def test_delete_missing_dream_returns_404(auth_client):
    resp = auth_client.delete("/api/dreams/999999")
    assert resp.status_code == 404


def test_delete_dream_removes_dreamtag_links(auth_client):
    """Löschkaskade: Tag-Verknüpfungen dürfen nach dem Löschen nicht mehr existieren."""
    resp = auth_client.post("/api/dreams", json=make_dream(dream_signs=["fliegen"]))
    dream_id = resp.json()["id"]
    auth_client.delete(f"/api/dreams/{dream_id}")

    # Traum mit demselben Zeichen erneut anlegen — wenn die alte Verknüpfung
    # noch existieren würde, käme es zu doppelten/ungültigen Relationen statt
    # eines sauberen 201 mit genau einem Zeichen.
    resp = auth_client.post("/api/dreams", json=make_dream(dream_signs=["fliegen"]))
    assert resp.status_code == 201
    assert resp.json()["dream_signs"] == ["fliegen"]

    tags_resp = auth_client.get("/api/tags")
    fliegen = [t for t in tags_resp.json() if t["name"] == "fliegen"]
    assert len(fliegen) == 1
    assert fliegen[0]["count"] == 1


def test_regression_echoes_route_order(auth_client):
    """Regressionstest Routen-Reihenfolge: /api/dreams/echoes darf nicht mit
    /api/dreams/{dream_id} kollidieren (sonst 422, weil 'echoes' als int geparst wird)."""
    resp = auth_client.get("/api/dreams/echoes", params={"text": "ein ziemlich langer suchtext"})
    assert resp.status_code == 200
    assert resp.json() == []


def test_echoes_finds_similar_dream(auth_client):
    auth_client.post("/api/dreams", json=make_dream(
        title="Original", content="ich fliege über die stadt und sehe die lichter"
    ))
    resp = auth_client.get(
        "/api/dreams/echoes",
        params={"text": "ich fliege über die stadt und sehe die lichter erneut"},
    )
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["title"] == "Original"


def test_echoes_excludes_given_id(auth_client):
    resp = auth_client.post("/api/dreams", json=make_dream(
        title="Original", content="ich fliege über die stadt und sehe die lichter"
    ))
    dream_id = resp.json()["id"]
    resp = auth_client.get(
        "/api/dreams/echoes",
        params={"text": "ich fliege über die stadt und sehe die lichter", "exclude_id": dream_id},
    )
    assert resp.json() == []


# ---------- Validierung ----------

def test_invalid_lucidity_returns_422(auth_client):
    resp = auth_client.post("/api/dreams", json=make_dream(lucidity=7))
    assert resp.status_code == 422


def test_invalid_sleep_quality_returns_422(auth_client):
    resp = auth_client.post("/api/dreams", json=make_dream(sleep_quality=9))
    assert resp.status_code == 422


def test_missing_title_returns_422(auth_client):
    payload = make_dream()
    del payload["title"]
    resp = auth_client.post("/api/dreams", json=payload)
    assert resp.status_code == 422
