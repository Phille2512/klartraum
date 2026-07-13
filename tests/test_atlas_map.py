from test_dreams import make_dream


def test_atlas_empty(auth_client):
    resp = auth_client.get("/api/atlas")
    assert resp.status_code == 200
    assert resp.json() == {"nodes": [], "links": []}


def test_atlas_builds_nodes_and_links(auth_client):
    auth_client.post("/api/dreams", json=make_dream(places=["zuhause"], persons=["mama"]))
    auth_client.post("/api/dreams", json=make_dream(places=["zuhause"], persons=["mama"]))
    resp = auth_client.get("/api/atlas")
    data = resp.json()
    nodes = {n["id"]: n for n in data["nodes"]}
    assert nodes["place:zuhause"]["count"] == 2
    assert nodes["person:mama"]["count"] == 2
    assert len(data["links"]) == 1
    link = data["links"][0]
    assert link["weight"] == 2


def test_atlas_min_count_filter(auth_client):
    auth_client.post("/api/dreams", json=make_dream(places=["einmalig"]))
    resp = auth_client.get("/api/atlas", params={"min_count": 2})
    assert resp.json()["nodes"] == []


def test_map_place_flow(auth_client):
    auth_client.post("/api/dreams", json=make_dream(places=["strand"]))
    tag_id = next(t["id"] for t in auth_client.get("/api/tags").json() if t["name"] == "strand")

    data = auth_client.get("/api/map").json()
    assert any(p["tag_id"] == tag_id for p in data["unplaced"])

    resp = auth_client.put(f"/api/map/nodes/{tag_id}", json={"x": 0.5, "y": 0.5})
    assert resp.status_code == 200

    data = auth_client.get("/api/map").json()
    placed = {p["tag_id"]: p for p in data["placed"]}
    assert placed[tag_id]["x"] == 0.5
    assert placed[tag_id]["dream_count"] == 1
    assert not any(p["tag_id"] == tag_id for p in data["unplaced"])


def test_map_node_bounds_validation(auth_client):
    auth_client.post("/api/dreams", json=make_dream(places=["strand"]))
    tag_id = next(t["id"] for t in auth_client.get("/api/tags").json() if t["name"] == "strand")
    resp = auth_client.put(f"/api/map/nodes/{tag_id}", json={"x": 1.5, "y": 0.5})
    assert resp.status_code == 422


def test_map_node_on_non_place_tag_returns_400(auth_client):
    auth_client.post("/api/dreams", json=make_dream(persons=["papa"]))
    tag_id = next(t["id"] for t in auth_client.get("/api/tags").json() if t["name"] == "papa")
    resp = auth_client.put(f"/api/map/nodes/{tag_id}", json={"x": 0.5, "y": 0.5})
    assert resp.status_code == 400


def test_map_paths_and_duplicate_rejection(auth_client):
    auth_client.post("/api/dreams", json=make_dream(places=["a-ort", "b-ort"]))
    tags = {t["name"]: t["id"] for t in auth_client.get("/api/tags").json()}
    a_id, b_id = tags["a-ort"], tags["b-ort"]
    auth_client.put(f"/api/map/nodes/{a_id}", json={"x": 0.1, "y": 0.1})
    auth_client.put(f"/api/map/nodes/{b_id}", json={"x": 0.9, "y": 0.9})

    resp = auth_client.post("/api/map/paths", json={"from_tag_id": a_id, "to_tag_id": b_id})
    assert resp.status_code == 201
    path_id = resp.json()["id"]

    resp = auth_client.post("/api/map/paths", json={"from_tag_id": b_id, "to_tag_id": a_id})
    assert resp.status_code == 409

    resp = auth_client.delete(f"/api/map/paths/{path_id}")
    assert resp.status_code == 204


def test_map_path_requires_both_placed(auth_client):
    auth_client.post("/api/dreams", json=make_dream(places=["a-ort", "b-ort"]))
    tags = {t["name"]: t["id"] for t in auth_client.get("/api/tags").json()}
    a_id, b_id = tags["a-ort"], tags["b-ort"]
    resp = auth_client.post("/api/map/paths", json={"from_tag_id": a_id, "to_tag_id": b_id})
    assert resp.status_code == 400


def test_delete_map_node_cascades_paths(auth_client):
    auth_client.post("/api/dreams", json=make_dream(places=["a-ort", "b-ort"]))
    tags = {t["name"]: t["id"] for t in auth_client.get("/api/tags").json()}
    a_id, b_id = tags["a-ort"], tags["b-ort"]
    auth_client.put(f"/api/map/nodes/{a_id}", json={"x": 0.1, "y": 0.1})
    auth_client.put(f"/api/map/nodes/{b_id}", json={"x": 0.9, "y": 0.9})
    auth_client.post("/api/map/paths", json={"from_tag_id": a_id, "to_tag_id": b_id})

    resp = auth_client.delete(f"/api/map/nodes/{a_id}")
    assert resp.status_code == 204

    data = auth_client.get("/api/map").json()
    assert data["paths"] == []


def test_map_regions(auth_client):
    auth_client.post("/api/dreams", json=make_dream(places=["a-ort"]))
    tag_id = next(t["id"] for t in auth_client.get("/api/tags").json() if t["name"] == "a-ort")

    resp = auth_client.post("/api/map/regions", json={"name": "Kindheit", "tag_ids": [tag_id]})
    assert resp.status_code == 201
    region_id = resp.json()["id"]

    tag_resp = auth_client.get("/api/tags").json()
    tag = next(t for t in tag_resp if t["id"] == tag_id)
    assert tag["name"] == "a-ort"

    map_data = auth_client.get("/api/map").json()
    assert any(r["id"] == region_id for r in map_data["regions"])

    resp = auth_client.delete(f"/api/map/regions/{region_id}")
    assert resp.status_code == 204
