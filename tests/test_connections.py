from test_dreams import make_dream

# Hinweis zu "Element doppelt im selben Traum zaehlt einmal" (Plan-Vorgabe):
# build_connections() dedupliziert Elemente pro Traum ueber ein set() auf
# (kind, name) -- defensiv korrekt. Ein eigener API-Test dafuer ist nicht
# moeglich: dieselbe Bezeichnung zweimal im selben Feld (z. B.
# dream_signs=["x", "x"]) fuehrt schon in apply_tags() (helpers.py) zu einem
# IntegrityError auf dreamtag(dream_id, tag_id), also VOR dieser Analyse.
# Als eigener Bug geflaggt (siehe spawn_task), nicht Teil von E.1.


def _connections(auth_client, **params):
    resp = auth_client.get("/api/stats/connections", params=params)
    assert resp.status_code == 200
    return resp.json()


def test_pair_below_min_support_is_excluded(auth_client):
    for date in ["2026-04-01", "2026-04-02"]:
        auth_client.post("/api/dreams", json=make_dream(date=date, dream_signs=["fliegen"], places=["strand"]))

    data = _connections(auth_client)
    assert data["element_pairs"] == []
    assert data["n_dreams"] == 2


def test_pair_at_min_support_and_lift_calculation(auth_client):
    # 3 Traeume mit Schule+Mutter, dazu je ein Traum nur mit Schule bzw. nur mit Mutter.
    for date in ["2026-04-01", "2026-04-02", "2026-04-03"]:
        auth_client.post("/api/dreams", json=make_dream(date=date, places=["Schule"], persons=["Mutter"]))
    auth_client.post("/api/dreams", json=make_dream(date="2026-04-04", places=["Schule"]))
    auth_client.post("/api/dreams", json=make_dream(date="2026-04-05", persons=["Mutter"]))

    data = _connections(auth_client)
    assert data["n_dreams"] == 5
    assert len(data["element_pairs"]) == 1
    pair = data["element_pairs"][0]
    assert pair["n"] == 3
    # element_counts: schule=4, mutter=4 -> lift = (3*5)/(4*4) = 0.9375 -> 0.94
    assert pair["lift"] == 0.94
    names = {pair["a"]["name"], pair["b"]["name"]}
    assert names == {"schule", "mutter"}
    kinds = {pair["a"]["kind"], pair["b"]["kind"]}
    assert kinds == {"place", "person"}


def test_emotion_element_pair_at_min_support(auth_client):
    for date in ["2026-04-01", "2026-04-02", "2026-04-03"]:
        auth_client.post(
            "/api/dreams",
            json=make_dream(date=date, dream_signs=["Zaehne"], emotions=["angst"]),
        )

    data = _connections(auth_client)
    assert len(data["emotion_elements"]) == 1
    ee = data["emotion_elements"][0]
    assert ee["emotion"] == "angst"
    assert ee["element"] == {"kind": "dream_sign", "name": "zaehne"}
    assert ee["n"] == 3
    # element_counts: zaehne=3, emotion_counts: angst=3 -> lift = (3*3)/(3*3) = 1.0
    assert ee["lift"] == 1.0


def test_connections_respect_date_filter(auth_client):
    for date in ["2026-04-01", "2026-04-02", "2026-04-03"]:
        auth_client.post("/api/dreams", json=make_dream(date=date, places=["Schule"], persons=["Mutter"]))
    # ausserhalb des Filters
    auth_client.post("/api/dreams", json=make_dream(date="2026-05-01", places=["Schule"], persons=["Mutter"]))

    data = _connections(auth_client, **{"from": "2026-04-01", "to": "2026-04-30"})
    assert data["n_dreams"] == 3
    assert data["element_pairs"][0]["n"] == 3


def test_connections_empty_without_enough_dreams(auth_client):
    data = _connections(auth_client)
    assert data == {"element_pairs": [], "emotion_elements": [], "n_dreams": 0}


def test_connections_require_authentication(client):
    resp = client.get("/api/stats/connections")
    assert resp.status_code == 401
