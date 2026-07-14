# 😴 Umsetzungsplan „Schlafzeit": Nächte erfassen, Erinnerung verstehen

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Konventionen — inkl. der
> neuen Regeln: Tests Pflicht, alle UI-Texte zweisprachig über `t()`).
>
> **Anlass (Philipp, Juli 2026):** Er will Fragen beantworten können wie
> „Wenn ich mehr Zeit zu schlafen habe — steigt mein Erinnerungsvermögen?"
> **Workflow-Anforderungen (verbindlich):**
> 1. Die Schlafzeit wird **aktiv eingetragen, nie abgeleitet** — insbesondere
>    NICHT aus dem Eintrags-Zeitpunkt (Philipp notiert Träume erst in Notizen
>    und trägt später nach; „Aufwachzeit = jetzt" wäre falsch).
> 2. Es braucht einen ehrlichen **„Weiß nicht mehr"-Zustand** und eine
>    **Grob-Erfassung** für zurückliegende Nächte.
> 3. Buckets entstehen **im Hintergrund** (Analyse), nie als Eingabe-Zwang.

---

## Stufe N.1: Datenmodell & API — die Nacht als eigene Einheit

Schlafzeit ist eine Eigenschaft der **Nacht**, nicht des Traums (mehrere
Träume pro Nacht!). Neue Tabelle:

```python
class Night(SQLModel, table=True):
    date: dt.date = Field(primary_key=True)  # Datum des Aufwachens = Traum-Datum
    bed_time: str | None = None    # "23:15" (HH:MM, Vorabend)
    wake_time: str | None = None   # "06:45" (HH:MM)
    sleep_minutes: int | None = None  # serverseitig abgeleitet
    confidence: str = "exact"      # exact | rough | unknown
```

**Ableitung `sleep_minutes` (serverseitig, einzige Quelle der Wahrheit):**
- `exact`: `(wake − bed) mod 24 h` — Mitternachts-Übergang korrekt
  (23:30→07:00 = 450 min; 01:00→08:00 = 420 min).
- `rough`: Bucket-Mitte — `unter6`→330 · `6bis7`→390 · `7bis8`→450 ·
  `ueber8`→510.
- `unknown`: `null` (bed/wake ebenfalls null).

**API** (geschützter Router; Fehler als i18n-Codes):
- `GET /api/nights/{date}` → Night oder 404.
- `PUT /api/nights/{date}` — Upsert, Body je Modus:
  `{bed_time, wake_time}` (→ exact) · `{bucket: "unter6"|…}` (→ rough) ·
  `{unknown: true}` (→ unknown). Genau EIN Modus pro Request, sonst 422
  (`invalid_night_payload`). Zeitformat `HH:MM`, 15-Minuten-Raster erzwingen
  (Minuten ∈ {00,15,30,45}, sonst 422).
- `DELETE /api/nights/{date}` → zurück zu „leer" (= noch nicht nachgetragen —
  bewusst verschieden von `unknown` = „abgeschlossen, unbekannt").
- `GET /api/nights/latest-exact` → jüngste exact-Nacht (für die Vorbelegung).

**Tests (Pflicht):** Ableitung über Mitternacht, Bucket-Mitten, Raster- und
Modus-Validierung, Upsert/Delete, 401.

## Stufe N.2: Erfassung im Formular — drei Wege

Im Detail-Bereich des Traum-Formulars (NICHT im Schnell-Pfad), bezogen auf
das **Traum-Datum** (bei Datumswechsel im Formular neu laden):

```
😴 Schlafzeit dieser Nacht:   [🕐 Zeiten] [🌫️ Nur grob] [❓ Weiß nicht mehr]
```

- Existiert die Nacht schon: kompakte Zusammenfassung statt Chips
  („😴 23:15 → 06:45 · ≈ 7,5 h" bzw. „😴 grob 7–8 h" bzw. „😴 unbekannt")
  mit „ändern"-Link. Beim zweiten Traum derselben Nacht also nur Anzeige.
- **🕐 Zeiten:** zwei `<input type="time" step="900">` (Zubettgehen /
  Aufwachen), Dauer live daneben („≈ 7,5 h"). **Vorbelegung:** Werte aus
  `latest-exact` als Vorschlag in den Feldern — gespeichert wird erst durch
  aktives „Übernehmen" (nie automatisch!).
- **🌫️ Nur grob:** vier Chips `unter 6 h · 6–7 h · 7–8 h · über 8 h` —
  ein Tipp speichert sofort.
- **❓ Weiß nicht mehr:** ein Tipp speichert `unknown`.
- Speichern läuft **unabhängig vom Traum-Speichern** direkt per PUT (die
  Nacht ist eine eigene Entität). Offline-Fall: Hinweis-Toast
  „Schlafzeit braucht Verbindung — trag sie später nach" — die Nacht wird
  bewusst NICHT in die Offline-Outbox aufgenommen (Vereinfachung; im
  Nachtrag-Workflow ist das verschmerzbar).

**Texte (zweisprachig, Regel 9):**

| Schlüssel | DE | EN |
|---|---|---|
| night.title | 😴 Schlafzeit dieser Nacht | 😴 Sleep time this night |
| night.times | 🕐 Zeiten | 🕐 Times |
| night.rough | 🌫️ Nur grob | 🌫️ Just roughly |
| night.unknown | ❓ Weiß nicht mehr | ❓ Don't remember |
| night.bed / night.wake | Zubettgehen / Aufwachen | Went to bed / Woke up |
| night.duration | ≈ {h} h Schlaf | ≈ {h} h of sleep |
| night.apply | Übernehmen | Apply |
| night.change | ändern | change |
| night.offline | Schlafzeit braucht Verbindung — trag sie später nach | Sleep time needs a connection — add it later |
| night.b.unter6 / 6bis7 / 7bis8 / ueber8 | unter 6 h / 6–7 h / 7–8 h / über 8 h | under 6 h / 6–7 h / 7–8 h / over 8 h |
| night.summary.unknown | unbekannt | unknown |

## Stufe N.3: Analyse — die Buckets im Hintergrund

`GET /api/stats` erweitern um `sleep`-Block (Nächte mit `sleep_minutes`,
gejoint mit den Träumen ihres Datums):

1. **Persönliche Terzile:** Nächte nach `sleep_minutes` in kurz/mittel/lang
   relativ zu **Philipps eigenem Median/Terzilen** teilen (nicht absolute
   Grenzen). Erst ab ≥ 9 erfassten Nächten rechnen, sonst Hinweis
   „Noch zu wenige Nächte erfasst".
2. **Neue Analyse-Karte „😴 Schlaf & Erinnerung"** (Sektion Experimente):
   je Terzil Ø Wörter pro Eintrag + Klartraum-Quote als Balkenpaare;
   Fußzeile: „n = 24 Nächte · davon 8 geschätzt · 3 unbekannt (nicht
   gezählt)". Gruppen mit n < 3 ausgrauen (Ehrlichkeits-Konvention).
   💡-Wissens-Moment: „Selbstauskunft, keine Messung — grobe Nächte zählen
   mit halber Beweiskraft. Korrelation ≠ Kausalität."
3. **Aufriss-Schalter erweitern:** neue Option „😴 Schlafdauer" — Split an
   **deinem Median** („kürzer / länger als deine typische Nacht"), damit
   erben alle bestehenden Aufriss-Analysen (Wörter, Luzidität, Emotionen)
   die Dimension ohne neue Charts.
4. Optionale Mini-Zeile (wenn Daten da): „Zubettgeh-Zeit vor/nach deinem
   Median × Ø Wörter" — die Lage-Dimension.

**Texte:** analog Regel 9 zweisprachig (u. a. „kurz/mittel/lang geschlafen" /
"short/medium/long sleep", „davon {n} geschätzt" / "{n} of them estimated").

**Tests:** Terzil-Zerlegung gegen handgerechneten Datensatz; rough zählt mit
Bucket-Mitte; unknown/leer fließen nirgends ein; Median-Split konsistent.

## Stufe N.4: Integrationen & Feinschliff

1. **Export:** CSV/JSON um `bed_time`, `wake_time`, `sleep_minutes`,
   `sleep_confidence` der zugehörigen Nacht erweitern (pro Traum-Zeile
   denormalisiert — Data-Science-freundlich).
2. **WBTB-Rechner:** Vorbelegung der Einschlafzeit aus dem Median der
   erfassten `bed_time`s (localStorage-Wert bleibt als Override).
3. **Doku:** `docs/ARCHITEKTUR.md` (Tabelle `night`, API-Gruppe),
   `docs/HANDBUCH.md` (Abschnitt im täglichen Rhythmus: „Schlafzeit —
   drei Wege, auch ‚weiß nicht mehr' ist eine Antwort").
4. **Ausblick verankern** (nur Kommentar im Code/Doku): Der spätere
   Schlaftracker-CSV-Import (BACKLOG) befüllt dieselbe `night`-Tabelle mit
   `confidence = "exact"` — Datenmodell ist dafür vorbereitet.

---

## Reihenfolge & Abschluss

```
N.1 Modell & API → N.2 Erfassung → N.3 Analyse → N.4 Integrationen
```

Pro Stufe: pytest grün (neue Tests inklusive), Desktop + 412 px + Rotlicht in
DE und EN, Testdaten restlos löschen, ein Commit. Nach Abschluss: Eintrag
„Schlafzeit-Auswahl" im BACKLOG als erledigt markieren (steht dort unter
„Erfassen & Alltag" sinngemäß als Schlafdaten-Idee) und `PROJEKT-KOMPASS.md`
Stand ergänzen.
