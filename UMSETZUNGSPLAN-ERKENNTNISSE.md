# 🔗 Umsetzungsplan „Erkenntnisse & Verbindungen": Analyse-Reiter vertiefen

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Konventionen — Tests Pflicht,
> alle UI-Texte zweisprachig über `t()`, Migrationen über
> `database.py::_migrate()`, Service-Worker-`SHELL`-Liste bei neuen Dateien).
>
> **Anlass (Philipp, Juli 2026):** Die Analyse soll Erkenntnisse und
> **Verbindungen einzelner Merkmale** sichtbar machen, nicht nur Zählwerte.
> **Verbindliche Prioritäts-Entscheidung:** Luzidität tritt bei Philipp
> aktuell **gar nicht** auf. Deshalb:
> 1. **Traumerinnerung und Trauminhalt zuerst** — dort entstehen täglich Daten.
> 2. Klartraum-Merkmale werden nur als **schlafender Baustein** vorbereitet
>    (Stufe E.6): kostet heute nichts, sammelt aber ab dem allerersten
>    Klartraum rückwirkungsfrei mit.
> 3. **Keine neuen Pflichtfelder.** Jede neue Erhebung ist optional und
>    kostet maximal einen Tap — Eintrags-Reibung ist der Feind des Tagebuchs.
> 4. **Kein Merkmal aus `created_at` ableiten.** Philipp notiert Träume erst
>    in Notizen und trägt später nach (verbindlich seit Plan SCHLAFZEIT) —
>    der Eintrags-Zeitpunkt sagt nichts über den Notiz-Zeitpunkt.

---

## Überblick der Stufen

| Stufe | Inhalt | Neue Daten? |
|---|---|---|
| E.1 | Verbindungs-Analyse → ausgelagert nach `UMSETZUNGSPLAN-VERBINDUNGEN.md` | nein |
| E.2 | Statistische Ehrlichkeit: n-Badges & „zu wenig Daten" | nein |
| E.3 | Erinnerungs-Block: Recall-Qualität + Notiz-Latenz | 2 optionale Chips |
| E.4 | Nacht- & Tages-Kontext: Aufwachart + Tagesbilanz | 1 Chip + 1 Ritual-Frage |
| E.5 | Element-Valenz: Beziehung zu Traumfiguren über Zeit | 1 Chip pro Person |
| E.6 | Klartraum-Baustein (schlafend, erscheint erst bei Luzidität) | nur bei Klarträumen |
| E.7 | Schlaf-Wirkungs-Paket: Albtraum, Valenz, Regelmäßigkeit — ohne Tracker | nein |

---

## Stufe E.1: Verbindungs-Analyse — was tritt gemeinsam auf?

**→ Verschoben und vertieft: `UMSETZUNGSPLAN-VERBINDUNGEN.md`** (Juli 2026).
Die ursprüngliche E.1-Spezifikation (Paar-Liste + Lift) ist dort zur
„Verstehens-Treppe" V.1–V.5 ausgebaut worden: Konditional-Sätze mit
Jaccard-Ranking und Fisher-Wächter (V.1), Emotions-Heatmap (V.2),
Atlas-Kanten (V.3), Element-Steckbrief (V.4), Engine-Generator „neue
Verbindungen" (V.5). **Diese Stufe hier nicht separat umsetzen** — sie
gilt als erledigt, sobald V.1 steht. Position in der Reihenfolge bleibt:
das V-Fundament kann vor E.2 beginnen, das V.1-Frontend braucht `nBadge`
aus E.2.

## Stufe E.2: Statistische Ehrlichkeit — n zeigen, Kleinst-n entschärfen

**Ziel:** Alle Vergleichs-Ansichten (Splits, Beifuß, Korrelationen,
Verbindungen) sagen ehrlich, auf wie vielen Datenpunkten sie stehen.
Fundament für alle folgenden Stufen — **vor** E.3 umsetzen.

- **Gemeinsamer Helfer** in `stats.js`: `nBadge(n, threshold=5)` → gibt ein
  kleines Badge-Element zurück: `n=4` grau + Tooltip/Untertitel
  „Noch wenig Daten — Tendenz, kein Befund" (zweisprachig über `t()`).
- Anbringen an: Vergleichs-Aufriss (beide Gruppen), Beifuß-Karte,
  Wochentag-/Schlafqualitäts-Korrelation (pro Balken bei Hover, gesamt als
  Badge), Terzil-Karte, künftig E.1/E.3/E.4-Karten.
- Bei `n < 3` auf einer Seite eines Vergleichs: **keine Prozentzahl**
  anzeigen, sondern „—" mit Hinweis (eine Quote aus 2 Träumen ist Rauschen).
- Backend liefert überall, wo gerundete Quoten stehen, auch die rohen
  Zähler mit (ist bei `beifuss.with.count` etc. schon der Fall — prüfen,
  ergänzen wo nicht).

**Tests:** Backend-Seite nur, falls Zähler ergänzt werden; UI-Schwellen
im Browser durchspielen (Konvention 8).

**Akzeptanz:** Kein Vergleich in der Analyse zeigt mehr eine Quote ohne
sichtbares n.

## Stufe E.3: Erinnerungs-Block — Qualität und Latenz als eigene Achsen

**Ziel:** Traumerinnerung von der Luziditäts-Skala entkoppeln. Zwei neue
**optionale** Merkmale pro Traum, als ein kompakter Block im
Detail-Bereich des Formulars (nicht im Schnell-Pfad):

```
🧠 Erinnerung:   [🧩 Fragment] [🎬 Szene] [🎞️ Ganzer Film]
✍️ Notiert:      [⚡ Direkt nach dem Aufwachen] [🌤️ Später am Tag] [📅 Tage später]
```

**Datenmodell (`models.py::Dream`, Migration in `_migrate()`):**
```python
recall_quality: str | None = None  # fragment | szene | film
note_latency: str | None = None    # sofort | spaeter | tage
```
Beide nullable — Altbestand und übersprungene Einträge bleiben ehrlich
„unbewertet". Validierung in `schemas.py` (Literal/Pattern, sonst 422).
`DreamIn`/`DreamOut` + `to_out` erweitern; Konvention 3 beachten
(keine Listenfelder, hier also unkritisch, aber `model_dump`-Muster prüfen).

**Analyse (`stats_helpers.py` + `stats.js`), neuer Abschnitt „🧠 Erinnerung":**
- **Qualitäts-Zeitreihe:** Anteil Fragment/Szene/Film je Bucket
  (gestapelte Balken, unbewertete Einträge als eigene neutrale Klasse).
- **Erinnerung × Schlaf:** Recall-Qualität und Wortzahl je
  Schlaf-Terzil (nutzt die bestehende, bewusst ungefilterte
  Terzil-Referenz aus `build_sleep_analysis`).
- **Latenz-Effekt:** Median-Wortzahl und Qualitätsverteilung je
  Notiz-Latenz — beantwortet „Lohnt sich das Sofort-Notieren messbar?".
- **Träume pro Nacht:** Ø und Verlauf (Träume gruppiert nach `date`) —
  gratis aus Bestandsdaten, gehört thematisch hierher.
- Überall `nBadge` aus E.2.

**Tests:** Feld-Validierung, Persistenz über Update, neue
Analyse-Aggregationen (inkl. Null-Werte), 401.

**Akzeptanz:** Ein Traum lässt sich weiterhin ohne jede Angabe im Block
speichern; der Analyse-Abschnitt erscheint ab dem ersten bewerteten Traum.

## Stufe E.4: Nacht- & Tages-Kontext — Aufwachart und Tagesbilanz

**Ziel:** Die zwei stärksten externen Einflussfaktoren minimal-invasiv
erfassen: *wie* du aufgewacht bist und *wie der Tag davor war*
(→ Tagesresiduen, die Jung-Frage „Was verarbeitet der Traum?").

**E.4a Aufwachart (`models.py::Night`, Migration):**
```python
wake_mode: str | None = None  # wecker | natuerlich
```
- Ein Chip-Paar im bestehenden Schlafzeit-Block des Formulars
  (`⏰ Wecker` / `🌅 Von selbst`), nur sichtbar bei Modus exact/rough.
- `PUT /api/nights/{date}` akzeptiert `wake_mode` zusätzlich in beiden
  Modi; bei `unknown` wird es genullt.
- Analyse: Recall-Qualität (E.3), Wortzahl und Träume/Nacht je Aufwachart —
  als Karte im Erinnerungs-Abschnitt.

**E.4b Tagesbilanz im Abendritual (neue Tabelle, `create_all` genügt):**
```python
class DayContext(SQLModel, table=True):
    date: dt.date = Field(primary_key=True)  # der zu Ende gehende Tag
    rating: int = Field(ge=1, le=5)          # „Wie war dein Tag?"
    keyword: str | None = None               # optional, EIN Stichwort
```
- API: `GET/PUT /api/days/{date}` (Upsert, geschützt; 422 bei rating
  außerhalb 1–5).
- UI: **eine** Zeile im Abendritual-Overlay (`app.js`, `ritual-content`):
  fünf Tap-Sterne/Punkte + optionales Ein-Wort-Feld („Was hat den Tag
  geprägt?"). Überspringbar, kein Zwang.
- Analyse „🌗 Tag & Traum" (neue Karte):
  - Emotions-Valenz der Folgenacht je Tagesbilanz (POS/NEG-Zuordnung der
    12 Emotions-Keys als statisches Mapping in `stats_helpers.py`;
    Traum vom `date + 1` gehört zur Bilanz von `date`).
  - **Tagesanklänge:** Taucht das Tages-Stichwort im Traumtext/-titel der
    Folgenacht auf (case-insensitive Substring)? Liste der Treffer der
    letzten 30 Tage — der direkteste Tagesresiduen-Nachweis.

**Tests:** Night-Erweiterung (Modi, Nullung bei unknown), DayContext-CRUD
+ Validierung, Folgenacht-Zuordnung (Datumsgrenze!), Valenz-Aggregation,
Anklang-Matching, 401.

**Akzeptanz:** Abendritual dauert höchstens einen Tap länger; alle neuen
Karten zeigen n-Badges und Leerzustände.

## Stufe E.5: Element-Valenz — wie entwickelt sich die Beziehung zu den Figuren?

**Ziel:** Der jungianische Fortschrittsindikator schlechthin: wird der
Schatten freundlicher? Dafür braucht die Valenz den Bezug **pro Auftreten**,
nicht pro Person global. Ergänzt `UMSETZUNGSPLAN-JUNG.md` (Innenwelt).

**Datenmodell (`models.py::DreamTag`, Migration in `_migrate()` —
Link-Tabelle bekommt eine Spalte):**
```python
valence: str | None = None  # bedrohlich | neutral | freundlich
```

**API:** `DreamIn` bekommt optional `person_valences: dict[str, str]`
(Name → Valenz); `apply_tags()`/Helfer schreiben die Valenz an die
DreamTag-Zeile der jeweiligen Person. Nur für kind=person auswerten
(Modell lässt mehr zu, UI bietet es nur für Personen an).
**Achtung Konvention 3:** neues Nicht-Modell-Feld in
`model_dump(exclude={...})` aufnehmen, sonst 500er.

**UI (Formular):** Nach der Personen-Eingabe erscheint pro erkannter
Person eine kleine Chip-Reihe `😨 · 😐 · 😊` (optional, vorbelegt: nichts).
Auch nachträglich beim Bearbeiten setzbar.

**Innenwelt (`innenwelt.js` + `routers/jung.py::innenwelt`):**
- Pro Archetyp/Person einen **Beziehungs-Verlauf**: Valenzen der letzten
  Auftritte chronologisch als Punktreihe (rot/grau/grün) + Trend-Pfeil,
  sobald ≥ 3 bewertete Auftritte vorliegen (`nBadge` sonst).
- Karte „Entwicklung": Figuren mit deutlichster Veränderung zuerst.

**Tests:** Valenz-Persistenz über create/update (inkl. Person entfernen),
Validierung, Innenwelt-Aggregation, 401.

**Akzeptanz:** Träume ohne Valenz-Angabe bleiben voll funktional; die
Innenwelt zeigt Verläufe erst ab 3 bewerteten Auftritten pro Figur.

## Stufe E.6: Klartraum-Baustein — schlafend vorbereitet

**Ziel:** Ab dem **ersten** Klartraum sollen die entscheidenden Merkmale
erfasst werden können, ohne dass vorher irgendetwas im Weg steht oder
Daten rückwirkend fehlen. Bis dahin: unsichtbar.

**Datenmodell (`models.py::Dream`, Migration):**
```python
lucid_trigger: str | None = None    # traumzeichen | reality_check | spontan | wbtb | wild
lucid_stability: str | None = None  # kurz | mittel | stabil
lucid_control: int | None = Field(default=None, ge=1, le=3)
```

**UI (Formular):** Block „✨ Klarheit im Detail" erscheint **nur**, wenn
Luzidität ≥ 3 gewählt ist (Ein-/Ausblenden beim Slider-Wechsel; beim
Zurückstufen unter 3 Felder leeren). Drei Chip-Reihen:
Auslöser („Wodurch wurdest du klar?"), Stabilität, Kontrolle (1–3).
Alles optional.

**Analyse:** Karte „✨ Klartraum-Details" im bestehenden
Klartraum-Abschnitt, erscheint erst, wenn mindestens ein Traum mit
Luzidität ≥ 3 existiert. Inhalt: Auslöser-Verteilung, Stabilität im
Verlauf, Kontrolle Ø — alles mit `nBadge` (hier auf lange Zeit klein!).
Bis dahin zeigt der Klartraum-Abschnitt unverändert die bestehenden
Kennzahlen — **kein** „0 von 0"-Lärm.

**Tests:** Validierung, Felder-Nullung bei Luzidität < 3 (serverseitig
erzwingen: Trigger/Stabilität/Kontrolle nur speichern, wenn lucidity ≥ 3,
sonst 422 `lucid_details_without_lucidity`), Sichtbarkeits-Logik der
Analyse-Karte, 401.

**Akzeptanz:** Für einen Nutzer ohne Klarträume ändert sich sichtbar
nichts — weder im Formular-Standardpfad noch in der Analyse.

## Stufe E.7: Schlaf-Wirkungs-Paket — ohne Tracker startklar

**Ziel:** Die Wirkung des Schlafs auf Erinnerung und Valenz messen, soweit
es die **manuell erfassten Nächte** hergeben — bewusst unabhängig vom
Tracker-Kauf (die Tracker-Vertiefung mit REM/Wachphasen übernimmt
`UMSETZUNGSPLAN-TRACKERDATEN.md` TD.3, die auf diese Karten aufsetzt).
Voraussetzungen: E.2 (`nBadge`) und das POS/NEG-Emotions-Mapping aus E.4b.
Alle Karten docken am bestehenden Analyse-Abschnitt „😴 Schlaf" an und
erscheinen ab **≥ 9 Nächten** mit Schlafdaten (Terzil-Prinzip wie gehabt).

**E.7a Schlaf × Albtraum-Quote** *(rein aus Bestandsdaten)*:
Albtraum-Anteil (`Dream.albtraum`) je Schlaf-Terzil — nutzt die bestehende,
bewusst ungefilterte Terzil-Referenz aus `build_sleep_analysis`. Binär und
damit die robusteste Valenz-Analyse; zuerst umsetzen.

**E.7b Schlaf × Emotions-Valenz:** POS/NEG-Anteil der Traum-Emotionen je
Schlaf-Terzil (Mapping aus E.4b in `stats_helpers.py`).
💡-Confounder-Hinweis direkt an der Karte: „Kurz geschlafen *und*
schlechter Tag? Beides hängt oft zusammen — sieh auch 🌗 Tag & Traum."

**E.7c Schlaf-Regelmäßigkeit × Erinnerung:** Chronobiologisch einer der
stärksten Prädiktoren, und `bed_time` liegt bereits vor.
- **Metrik:** Jede exact-Nacht bekommt die Standardabweichung der
  Zubettgehzeiten ihrer **letzten 7 exact-Nächte** (mindestens 5 davon
  vorhanden, sonst unbewertet). Zeiten dafür als „Minuten seit 18:00"
  rechnen (mod 24 h), damit 23:30 und 00:15 nicht künstlich 23 h
  auseinanderliegen — Mitternachts-Fall explizit testen.
- **Buckets:** regelmäßig (< 30 min) · mittel (30–60) · unregelmäßig (> 60).
- **Zielgrößen je Bucket:** Recall-Qualität (E.3), Ø Wörter, Träume/Nacht;
  Klartraum-Quote zusätzlich, aber nach der **Schlafend-Regel aus E.6**
  (erst sichtbar ab dem ersten Traum mit Luzidität ≥ 3).

**Tests (Pflicht):** Zirkuläre Zeit-Rechnung über Mitternacht,
Fenster-Mindestbelegung, Bucket-Grenzen, Terzil-Aggregationen für E.7a/b
gegen handgerechnete Fixtures, Leerzustände unter 9 Nächten, 401.

**Akzeptanz:** Alle Karten mit n-Badge und Leerzustand; keine
Luziditäts-Karte sichtbar, solange kein Klartraum existiert.

---

## Reihenfolge & Abschluss

**Reihenfolge:** E.1 → E.2 → E.3 → E.4 → **E.7** → E.5 → E.6. E.1/E.2 sind
reine Auswertung bzw. UI-Härtung und sofort wertstiftend; E.3/E.4 beginnen
die Datensammlung (je früher, desto eher tragen die Analysen); E.7 folgt
direkt auf E.4, weil es dessen Emotions-Mapping braucht und ohne Tracker
auskommt; E.5 ist am UI-invasivsten; E.6 ist bewusst zuletzt (schlafend).

**Nach jeder Stufe:**
- `docs/ARCHITEKTUR.md` mitpflegen (Datenmodell/API ändern sich in E.3–E.6!).
- Neue UI-Texte zweisprachig über `t()`; keine neuen JS-Dateien geplant —
  falls doch, `SHELL`-Liste in `sw.js` ergänzen.
- Testeinträge nur als `TEST-…` und restlos löschen (Konvention 7);
  Stufe im Browser durchspielen.

**Vier-Wochen-Review (wie im Kompass):** Nach ~4 Wochen echter Nutzung
prüfen, welche der optionalen Chips tatsächlich benutzt werden —
Unbenutztes einklappen oder entfernen. Insbesondere E.4b (Tagesbilanz)
ist ein Experiment: Wenn das Abendritual dadurch seltener wird, fliegt
die Frage wieder raus.

**Explizit NICHT in diesem Plan (→ `BACKLOG.md`):**
- Generisches Experiment-Framework (beliebige A/B-Faktoren statt nur
  Beifuß) — erst sinnvoll, wenn E.3/E.4-Daten ein paar Wochen alt sind.
- Schlaftracker-Anbindung — eigener Plan `UMSETZUNGSPLAN-TRACKERDATEN.md`;
  dessen Stufe TD.3 setzt auf E.2–E.7 auf und vertieft die Schlaf-Karten
  um REM-/Wachphasen-Terzile.
- Automatische Textanalyse des Trauminhalts (Wortfelder, Themen) — groß,
  eigener Plan, falls je gewünscht.
