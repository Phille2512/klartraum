def test_status_not_configured(client):
    resp = client.get("/api/auth/status")
    assert resp.status_code == 200
    assert resp.json() == {"configured": False}


def test_setup_then_status_configured(client):
    resp = client.post("/api/auth/setup", json={"password": "geheim123"})
    assert resp.status_code == 200
    assert "token" in resp.json()

    resp = client.get("/api/auth/status")
    assert resp.json() == {"configured": True}


def test_setup_twice_returns_409(client):
    client.post("/api/auth/setup", json={"password": "geheim123"})
    resp = client.post("/api/auth/setup", json={"password": "andereswort"})
    assert resp.status_code == 409


def test_setup_password_too_short_returns_422(client):
    resp = client.post("/api/auth/setup", json={"password": "abc"})
    assert resp.status_code == 422


def test_login_correct_password(client):
    client.post("/api/auth/setup", json={"password": "geheim123"})
    resp = client.post("/api/auth/login", json={"password": "geheim123"})
    assert resp.status_code == 200
    assert "token" in resp.json()


def test_login_wrong_password_returns_401(client):
    client.post("/api/auth/setup", json={"password": "geheim123"})
    resp = client.post("/api/auth/login", json={"password": "falsch"})
    assert resp.status_code == 401


def test_protected_endpoint_without_token_returns_401(client):
    resp = client.get("/api/dreams")
    assert resp.status_code == 401


def test_protected_endpoint_with_bad_token_returns_401(client):
    client.headers["Authorization"] = "Bearer irgendwas-falsches"
    resp = client.get("/api/dreams")
    assert resp.status_code == 401


def test_protected_endpoint_with_valid_token_returns_200(auth_client):
    resp = auth_client.get("/api/dreams")
    assert resp.status_code == 200


def test_token_limit_drops_oldest(client):
    """MAX_TOKENS = 10: das älteste Gerät fliegt raus, wenn ein elftes sich anmeldet."""
    client.post("/api/auth/setup", json={"password": "geheim123"})
    tokens = []
    for _ in range(11):
        resp = client.post("/api/auth/login", json={"password": "geheim123"})
        tokens.append(resp.json()["token"])

    oldest = tokens[0]
    newest = tokens[-1]

    # Ältestes Token darf nicht mehr gültig sein
    resp = client.get("/api/dreams", headers={"Authorization": f"Bearer {oldest}"})
    assert resp.status_code == 401
    # Neuestes Token ist weiterhin gültig
    resp = client.get("/api/dreams", headers={"Authorization": f"Bearer {newest}"})
    assert resp.status_code == 200


# ---------- 401-Matrix: jeder geschützte Endpunkt ohne Token ----------

PROTECTED_GET_ENDPOINTS = [
    "/api/dreams",
    "/api/tags",
    "/api/goals",
    "/api/intentions/current",
    "/api/stats",
    "/api/atlas",
    "/api/map",
    "/api/innenwelt",
    "/api/mandala",
    "/api/sync-events",
    "/api/datainfo",
    "/api/export",
    "/api/dreams/echoes?text=abcdefghij",
]


def test_401_matrix_get_endpoints(client):
    for path in PROTECTED_GET_ENDPOINTS:
        resp = client.get(path)
        assert resp.status_code == 401, f"{path} sollte 401 liefern, war {resp.status_code}"
