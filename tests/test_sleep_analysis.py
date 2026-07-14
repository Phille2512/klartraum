from test_dreams import make_dream

# N.3: 9 Nächte mit von Hand nachgerechneten Schlafdauern (360..600 Minuten in
# 30-Minuten-Schritten, damit alle Zeiten auf dem 15-Minuten-Raster liegen)
# und je einem Traum mit steigender Wortzahl/Luzidität — zeigt den
# motivierenden Zusammenhang aus dem Plan ("mehr Schlaf -> mehr Erinnerung")
# und lässt sich exakt nachrechnen.
NIGHTS = [
    ("2026-02-01", "23:00", "05:00", 360),
    ("2026-02-02", "23:00", "05:30", 390),
    ("2026-02-03", "23:00", "06:00", 420),
    ("2026-02-04", "23:00", "06:30", 450),
    ("2026-02-05", "23:00", "07:00", 480),
    ("2026-02-06", "23:00", "07:30", 510),
    ("2026-02-07", "23:00", "08:00", 540),
    ("2026-02-08", "23:00", "08:30", 570),
    ("2026-02-09", "23:00", "09:00", 600),
]

DREAMS = [
    ("2026-02-01", "eins zwei drei", 1),
    ("2026-02-02", "eins zwei", 0),
    ("2026-02-03", "eins", 1),
    ("2026-02-04", "eins zwei drei vier", 2),
    ("2026-02-05", "eins zwei drei vier fuenf", 3),
    ("2026-02-06", "eins zwei drei vier fuenf sechs", 2),
    ("2026-02-07", "eins zwei drei vier fuenf sechs sieben", 3),
    ("2026-02-08", "eins zwei drei vier fuenf sechs sieben acht", 4),
    ("2026-02-09", "eins zwei drei vier fuenf sechs sieben acht neun", 3),
]


def _seed_nine_nights(auth_client):
    for date, bed, wake, _minutes in NIGHTS:
        resp = auth_client.put(f"/api/nights/{date}", json={"bed_time": bed, "wake_time": wake})
        assert resp.status_code == 200, resp.text
    for date, content, lucidity in DREAMS:
        resp = auth_client.post("/api/dreams", json=make_dream(date=date, content=content, lucidity=lucidity))
        assert resp.status_code == 201, resp.text


def test_sleep_analysis_unavailable_below_nine_nights(auth_client):
    for date, bed, wake, _minutes in NIGHTS[:5]:
        auth_client.put(f"/api/nights/{date}", json={"bed_time": bed, "wake_time": wake})

    resp = auth_client.get("/api/stats", params={"granularity": "day"})
    sleep = resp.json()["sleep"]
    assert sleep["available"] is False
    assert sleep["n_total"] == 5


def test_sleep_analysis_terciles_match_hand_computed_dataset(auth_client):
    _seed_nine_nights(auth_client)

    resp = auth_client.get("/api/stats", params={"granularity": "day"})
    sleep = resp.json()["sleep"]

    assert sleep["available"] is True
    assert sleep["n_total"] == 9
    assert sleep["n_estimated"] == 0
    assert sleep["n_unknown"] == 0

    # kurz: 360/380/400 min -> Wörter 3/2/1 (Ø 2.0), 1x lucidity>=3 -> 0%
    assert sleep["kurz"]["n_nights"] == 3
    assert sleep["kurz"]["n_dreams"] == 3
    assert sleep["kurz"]["avg_words"] == 2.0
    assert sleep["kurz"]["lucid_rate"] == 0.0

    # mittel: 420/440/460 min -> Wörter 4/5/6 (Ø 5.0), 1 von 3 lucid (33.3%)
    assert sleep["mittel"]["n_nights"] == 3
    assert sleep["mittel"]["n_dreams"] == 3
    assert sleep["mittel"]["avg_words"] == 5.0
    assert sleep["mittel"]["lucid_rate"] == 33.3

    # lang: 480/500/520 min -> Wörter 7/8/9 (Ø 8.0), alle 3 lucid (100%)
    assert sleep["lang"]["n_nights"] == 3
    assert sleep["lang"]["n_dreams"] == 3
    assert sleep["lang"]["avg_words"] == 8.0
    assert sleep["lang"]["lucid_rate"] == 100.0


def test_rough_night_counts_with_bucket_midpoint_and_as_estimated(auth_client):
    _seed_nine_nights(auth_client)
    # 10. Nacht, grob erfasst -> Bucket-Mitte 330 min (unter6), zählt als geschätzt
    auth_client.put("/api/nights/2026-02-10", json={"bucket": "unter6"})
    auth_client.post("/api/dreams", json=make_dream(date="2026-02-10", content="zehn", lucidity=0))

    resp = auth_client.get("/api/stats", params={"granularity": "day"})
    sleep = resp.json()["sleep"]

    assert sleep["n_total"] == 10
    assert sleep["n_estimated"] == 1
    # sortiert: 330,360,390,420,450,480,510,540,570,600 (n=10, i1=3, i2=6)
    # kurz=[330,360,390], mittel=[420,450,480], lang=[510,540,570,600] --
    # die grobe 330-Nacht ist jetzt die kürzeste und landet in "kurz"
    assert sleep["kurz"]["n_nights"] == 3
    assert sleep["mittel"]["n_nights"] == 3
    assert sleep["lang"]["n_nights"] == 4


def test_unknown_nights_and_dreamless_or_nightless_dates_are_excluded(auth_client):
    _seed_nine_nights(auth_client)
    # unbekannte Nacht: zählt in n_unknown, aber nirgends in den Terzilen
    auth_client.put("/api/nights/2026-02-11", json={"unknown": True})
    auth_client.post("/api/dreams", json=make_dream(date="2026-02-11", content="elf sehr viele woerter hier", lucidity=4))
    # Traum ganz ohne Nacht-Eintrag: darf nirgends auftauchen
    auth_client.post("/api/dreams", json=make_dream(date="2026-02-12", content="zwoelf", lucidity=4))

    resp = auth_client.get("/api/stats", params={"granularity": "day"})
    sleep = resp.json()["sleep"]

    assert sleep["n_total"] == 9  # unbekannte + nachtlose Nacht zählen nicht mit
    assert sleep["n_unknown"] == 1
    total_counted_dreams = sleep["kurz"]["n_dreams"] + sleep["mittel"]["n_dreams"] + sleep["lang"]["n_dreams"]
    assert total_counted_dreams == 9  # weder der unknown- noch der nachtlose Traum zählt mit


def test_sleep_split_uses_personal_median(auth_client):
    _seed_nine_nights(auth_client)

    resp = auth_client.get("/api/stats", params={"granularity": "day", "split": "sleep"})
    split = resp.json()["split"]

    assert split["kind"] == "sleep"
    # Median von [360,380,400,420,440,460,480,500,520] = 440 (mittlerer Wert)
    # laenger (>= 440): 440/460/480/500/520 -> 5 Traeume; kuerzer: 360/380/400/420 -> 4
    assert split["n_a"] == 5
    assert split["n_b"] == 4


def test_sleep_split_ignores_date_filter_for_the_median(auth_client):
    _seed_nine_nights(auth_client)

    # Zeitraum-Filter schraenkt die betrachteten Traeume ein, aber der
    # persoenliche Median bleibt stabil (aus allen Naechten berechnet).
    resp = auth_client.get(
        "/api/stats",
        params={"granularity": "day", "split": "sleep", "from": "2026-02-01", "to": "2026-02-05"},
    )
    split = resp.json()["split"]
    # Im gefilterten Zeitraum (01.-05.02) liegen nur die kurz/mittel-Naechte;
    # der globale Median (440) teilt sie in 1 laenger (440) vs 4 kuerzer.
    assert split["n_a"] == 1
    assert split["n_b"] == 4
