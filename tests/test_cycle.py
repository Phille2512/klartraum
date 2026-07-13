def test_goals_lifecycle(auth_client):
    assert auth_client.get("/api/goals").json() == []

    resp = auth_client.post("/api/goals", json={"text": "In einem Traum fliegen"})
    assert resp.status_code == 201
    goal = resp.json()
    assert goal["done"] is False
    assert goal["done_at"] is None
    goal_id = goal["id"]

    resp = auth_client.patch(f"/api/goals/{goal_id}", json={"done": True})
    assert resp.status_code == 200
    assert resp.json()["done"] is True
    assert resp.json()["done_at"] is not None

    resp = auth_client.patch(f"/api/goals/{goal_id}", json={"done": False})
    assert resp.json()["done"] is False
    assert resp.json()["done_at"] is None

    resp = auth_client.delete(f"/api/goals/{goal_id}")
    assert resp.status_code == 204
    assert auth_client.get("/api/goals").json() == []


def test_goals_open_before_done(auth_client):
    r1 = auth_client.post("/api/goals", json={"text": "Ziel A"}).json()
    auth_client.post("/api/goals", json={"text": "Ziel B"})
    auth_client.patch(f"/api/goals/{r1['id']}", json={"done": True})

    goals = auth_client.get("/api/goals").json()
    # offene zuerst, dann erledigte
    assert goals[0]["text"] == "Ziel B"
    assert goals[1]["text"] == "Ziel A"


def test_update_missing_goal_returns_404(auth_client):
    resp = auth_client.patch("/api/goals/999999", json={"done": True})
    assert resp.status_code == 404


def test_delete_missing_goal_returns_404(auth_client):
    resp = auth_client.delete("/api/goals/999999")
    assert resp.status_code == 404


def test_intention_current_is_null_initially(auth_client):
    resp = auth_client.get("/api/intentions/current")
    assert resp.status_code == 200
    assert resp.json() is None


def test_create_intention_and_read_current(auth_client):
    resp = auth_client.post("/api/intentions", json={"text": "Ich will fliegen"})
    assert resp.status_code == 201

    current = auth_client.get("/api/intentions/current").json()
    assert current["text"] == "Ich will fliegen"
    assert current["fulfilled"] is None
    assert current["is_today"] is True


def test_create_intention_same_day_overwrites_not_duplicates(auth_client):
    auth_client.post("/api/intentions", json={"text": "Erste Absicht"})
    auth_client.post("/api/intentions", json={"text": "Zweite Absicht"})

    current = auth_client.get("/api/intentions/current").json()
    assert current["text"] == "Zweite Absicht"


def test_fulfill_intention(auth_client):
    auth_client.post("/api/intentions", json={"text": "Ich will fliegen"})
    intention_id = auth_client.get("/api/intentions/current").json()["id"]

    resp = auth_client.patch(f"/api/intentions/{intention_id}", json={"fulfilled": True})
    assert resp.status_code == 200
    assert resp.json()["fulfilled"] is True

    # kein offenes "current" mehr
    assert auth_client.get("/api/intentions/current").json() is None


def test_fulfill_missing_intention_returns_404(auth_client):
    resp = auth_client.patch("/api/intentions/999999", json={"fulfilled": True})
    assert resp.status_code == 404
