from test_dreams import make_dream


def _seed_known_dataset(auth_client):
    """3 Träume mit von Hand nachgerechneten Kennzahlen (Pflicht-Testfall
    aus dem Sicherheitsnetz-Plan: 'Stats rechnen korrekt gegen einen
    kleinen, handverifizierten Datensatz')."""
    auth_client.post("/api/dreams", json=make_dream(
        title="D1", date="2026-01-06", lucidity=4, content="eins zwei drei",
        substances=["beifuss"], emotions=["freude"],
    ))
    auth_client.post("/api/dreams", json=make_dream(
        title="D2", date="2026-01-07", lucidity=1, content="vier fuenf",
        substances=[], emotions=["angst"],
    ))
    auth_client.post("/api/dreams", json=make_dream(
        title="D3", date="2026-01-08", lucidity=0, content="sechs",
        substances=[], emotions=[],
    ))


def _stats(auth_client, **params):
    params.setdefault("from", "2026-01-06")
    params.setdefault("to", "2026-01-08")
    params.setdefault("granularity", "day")
    resp = auth_client.get("/api/stats", params=params)
    assert resp.status_code == 200
    return resp.json()


def test_totals_and_lucid_rate(auth_client):
    _seed_known_dataset(auth_client)
    data = _stats(auth_client)
    assert data["total"] == 3
    assert data["remembered"] == 2  # D1 (4), D2 (1) — D3 hat lucidity 0
    assert data["lucid"] == 1       # nur D1 (lucidity >= 3)
    assert data["lucid_rate"] == 33.3


def test_lucidity_distribution(auth_client):
    _seed_known_dataset(auth_client)
    data = _stats(auth_client)
    # Index = lucidity-Level 0..4: D3->0, D2->1, D1->4
    assert data["lucidity_distribution"] == [1, 1, 0, 0, 1]


def test_per_bucket_word_counts(auth_client):
    _seed_known_dataset(auth_client)
    data = _stats(auth_client)
    by_bucket = {b["bucket"]: b for b in data["per_bucket"]}
    assert by_bucket["2026-01-06"] == {"bucket": "2026-01-06", "total": 1, "lucid": 1, "words": 3, "avg_words": 3}
    assert by_bucket["2026-01-07"] == {"bucket": "2026-01-07", "total": 1, "lucid": 0, "words": 2, "avg_words": 2}
    assert by_bucket["2026-01-08"] == {"bucket": "2026-01-08", "total": 1, "lucid": 0, "words": 1, "avg_words": 1}


def test_beifuss_split_quotes(auth_client):
    _seed_known_dataset(auth_client)
    data = _stats(auth_client)
    assert data["beifuss"]["with"] == {"count": 1, "lucid_rate": 100.0}
    assert data["beifuss"]["without"] == {"count": 2, "lucid_rate": 0.0}


def test_emotions_distribution(auth_client):
    _seed_known_dataset(auth_client)
    data = _stats(auth_client)
    dist = {e["emotion"]: e["count"] for e in data["emotions_analysis"]["distribution"]}
    assert dist == {"freude": 1, "angst": 1}


def test_stats_empty_dataset(auth_client):
    resp = auth_client.get("/api/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["lucid_rate"] == 0.0
    assert data["per_bucket"] == []


def test_stats_invalid_granularity_returns_422(auth_client):
    resp = auth_client.get("/api/stats", params={"granularity": "jahrhundert"})
    assert resp.status_code == 422


def test_stats_split_beifuss(auth_client):
    _seed_known_dataset(auth_client)
    data = _stats(auth_client, split="beifuss")
    assert data["split"]["kind"] == "beifuss"
    assert data["split"]["n_a"] == 1  # mit Beifuß
    assert data["split"]["n_b"] == 2  # ohne Beifuß


def test_phenomena_counts_and_hints(auth_client):
    auth_client.post("/api/dreams", json=make_dream(
        title="P1", date="2026-01-06", falsches_erwachen=True, traum_im_traum=True,
    ))
    auth_client.post("/api/dreams", json=make_dream(
        title="P2", date="2026-01-07", falsches_erwachen=True, albtraum=True,
    ))
    data = _stats(auth_client)
    assert data["phenomena"]["counts"]["falsches_erwachen"] == 2
    assert data["phenomena"]["counts"]["traum_im_traum"] == 1
    assert data["phenomena"]["counts"]["albtraum"] == 1
    assert data["phenomena"]["counts"]["schlafparalyse"] == 0
    hints = " ".join(data["phenomena"]["hints"])
    assert "Reality-Check" in hints
    assert "Traum-im-Traum" in hints


def test_phenomena_empty_when_no_flags_set(auth_client):
    _seed_known_dataset(auth_client)
    data = _stats(auth_client)
    assert all(count == 0 for count in data["phenomena"]["counts"].values())
    assert data["phenomena"]["hints"] == []


def test_incubation_rate_in_stats(auth_client):
    auth_client.post("/api/intentions", json={"text": "fliegen üben"})
    intention_id = auth_client.get("/api/intentions/current").json()["id"]
    auth_client.patch(f"/api/intentions/{intention_id}", json={"fulfilled": True})

    data = auth_client.get("/api/stats").json()
    assert data["incubation"] == {"total": 1, "fulfilled": 1, "rate": 100.0}
