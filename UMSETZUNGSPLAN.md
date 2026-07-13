# 🛠️ Umsetzungsplan: Nächste Stufen (Horizont 1 + Traumweltkarte)

> Dieses Dokument ist eine **eigenständige Spezifikation**: Ein Implementierer
> (Mensch oder KI-Modell) soll damit ohne weiteren Kontext arbeiten können.
> Vision und Gesamtbild stehen in `ROADMAP.md`. Sprache der UI: **Deutsch**.

---

## Teil A — Kontext für den Implementierer

### Projekt & Start

- Projektordner: `/Users/phille/Desktop/Application Klarträumen`
- Stack: **FastAPI + SQLite (SQLModel)** im Backend, **Vanilla JS** (keine
  Frameworks) im Frontend, ausgeliefert vom selben Server. PWA mit Service Worker.
- Start: `.venv/bin/uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000`
  → App auf `http://localhost:8000`. Abhängigkeiten: `requirements.txt` (venv existiert).
- Einzelnutzer-App mit Passwortschutz: Alle `/api/*`-Routen (außer `/api/auth/*`)
  erfordern `Authorization: Bearer <token>`. Der Browser des Nutzers ist
  angemeldet (Token in `localStorage["auth-token"]`, verwaltet von `js/auth.js`).

### Architektur & Dateien

```
backend/main.py      – App-Factory, Middleware, Static Files, Router-Includes (seit S.3)
backend/deps.py       – get_session, require_auth
backend/schemas.py     – alle Pydantic-Schemas (DreamIn/DreamOut, ...)
backend/helpers.py     – to_out, apply_tags, get_or_create_tag
backend/stats_helpers.py – Statistik-Berechnungen für routers/stats.py
backend/routers/*.py   – Endpunkte nach API-Gruppe (auth, dreams, tags, cycle,
                          stats, atlas, map, jung, export) — je eigener
                          APIRouter(prefix="/api", dependencies=[Depends(require_auth)]),
                          außer auth.py (ungeschützt)
backend/models.py    – SQLModel: Dream, Tag (kind: tag|dream_sign|place|person), DreamTag
backend/database.py  – Engine, init_db(), _migrate() (PRAGMA-basierte ALTER TABLEs)
backend/backup.py     – automatische Backups (S.1): SQLite-Backup-API, Rotation
backend/auth.py      – Passwort-Hash + Token-Verwaltung (auth.json, git-ignoriert)
frontend/index.html  – Single Page, 4 Tabs: Tagebuch, Analyse, Atlas, Lernen
frontend/js/app.js   – Tab-Navigation, Modul-Init, SW-Registrierung
frontend/js/api.js   – fetch-Wrapper `api` (setzt Auth-Header; wirft isNetworkError/isAuthError)
frontend/js/auth.js  – Login/Setup-Overlay
frontend/js/journal.js – Tagebuch (Formular, Liste); Helfer: escapeHtml, formatDate, todayISO, splitList
frontend/js/offline.js – IndexedDB-Outbox für neue Träume bei Server-Ausfall
frontend/js/stats.js – Analyse (Chart.js via CDN), Traumkompass, Export
frontend/js/atlas.js – Netzwerk-Karte (SVG, eigene Kräfte-Simulation)
frontend/js/learn.js – Guides, Reality-Check-Erinnerung, WBTB-Rechner
frontend/sw.js       – Service Worker, Netz-zuerst, Cache-Name `klartraum-vN`
```

### Konventionen & Fallstricke (WICHTIG)

1. **Service Worker (seit S.4 automatisiert):** Die Cache-Version in `sw.js`
   wird NICHT mehr manuell hochgezählt — `main.py::service_worker` ersetzt
   den Platzhalter `__VERSION__` beim Ausliefern durch einen aus den mtimes
   aller `frontend/`-Dateien berechneten Hash. Bei JEDER Frontend-Änderung
   nur noch: neue JS-Dateien in die `SHELL`-Liste in `sw.js` aufnehmen.
   Sonst sehen Nutzer alte Versionen.
2. **Migrationen:** `SQLModel.metadata.create_all` legt nur neue *Tabellen* an.
   Neue *Spalten* in bestehenden Tabellen brauchen einen Eintrag in
   `database.py::_migrate()` (Muster: `PRAGMA table_info(...)` prüfen, dann
   `ALTER TABLE ... ADD COLUMN ...`). Neue Tabellen: einfach in `models.py`
   definieren, `create_all` erledigt den Rest.
3. **Listenfelder an DreamIn** (tags, dream_signs, places, persons) existieren
   NICHT am `Dream`-Modell — sie laufen über `apply_tags()`. In
   `create_dream`/`update_dream` müssen sie in `model_dump(exclude={...})`
   ausgeklammert werden, sonst wirft Pydantic `ValueError` (500er).
   Bei neuen Listenfeldern dieses Muster beibehalten.
4. **Module-Muster im Frontend:** Ein Objektliteral pro Datei (`const journal = {...}`),
   Initialisierung in `app.js`. Kein Build-Schritt, keine Imports — Skript-
   Reihenfolge in `index.html` beachten (Helfer wie `escapeHtml` kommen aus `journal.js`).
5. **api.js benutzen** für alle Requests (setzt Auth-Header, einheitliche Fehler).
   Fehlerobjekte haben ggf. `isNetworkError` (Server aus) oder `isAuthError` (401).
   Die Offline-Outbox (`offline.js`) bricht bei beiden ab, statt Einträge zu verwerfen.
6. **Design:** Dunkles Theme über CSS-Variablen in `css/style.css` (`--bg`,
   `--bg-card`, `--accent: #8b7ff5`, `--lucid: #f5c66a` …). Mobile-first,
   Zielgerät Google Pixel (~412 px). Emojis als Icons sind Stilmittel der App.
7. **Nutzerdaten sind heilig:** `backend/dreams.db` enthält echte Träume.
   Testeinträge mit erkennbarem Titel anlegen (z. B. `TEST-…`) und danach
   restlos löschen. `dreams.db` und `auth.json` sind git-ignoriert — nie committen.
8. **Verifikation:** Jede Stufe zusätzlich im Browser durchspielen (auch
   mobiler Viewport 412 px) und erst dann committen. Ein Commit pro Stufe,
   Nachrichten auf Deutsch.
9. **Testeinträge in `dreams.db` gehören NICHT in die automatisierte Suite** —
   das ist manuelle Verifikation im Browser gegen die echte Datenbank. Für
   automatisierte Backend-Tests siehe Punkt 10.
10. **Testsuite (seit S.2 des Sicherheitsnetz-Plans):** `.venv/bin/pytest`
    (Konfiguration in `tests/conftest.py`, läuft gegen eine Temp-DB, nie
    gegen echte Daten). Jede Stufe jedes Plans endet mit grüner Testsuite;
    neue Endpunkte bringen ihre Tests mit.
11. **Zweisprachigkeit (seit I.1 des I18N-Plans):** Jeder neue UI-Text läuft
    über `t()` (`frontend/js/i18n.js`) mit Eintrag in BEIDEN Sprachen —
    niemals hart kodieren. Nutzerdaten (Traumtexte, Tags, Orte, Personen,
    Notizen) werden NIEMALS übersetzt. Pläne liefern neue Texte künftig
    deutsch und englisch.

### Bestehende API (Kurzreferenz)

- `GET/POST /api/dreams`, `GET/PUT/DELETE /api/dreams/{id}` — Felder siehe `DreamIn`
- `GET /api/tags` · `PUT /api/tags/{id}/category` (Kompass-Kategorie)
- `GET /api/stats` — Kennzahlen, per_week, compass, focus_sign, beifuss
- `GET /api/atlas` — nodes + links fürs Netz
- `GET /api/export?format=json|csv`
- `GET /api/auth/status` · `POST /api/auth/setup|login`

---

## Teil B — Die Stufen

Reihenfolge ist verbindlich (spätere Stufen nutzen frühere). Jede Stufe endet
mit funktionierender App + Commit.

---

### Stufe 1: Abendritual & Trauminkubation  *(Kern von Horizont 1)*

**Ziel:** Die App bekommt einen Abend-Modus. Der Nutzer formuliert vor dem
Schlafen eine Traumabsicht; am Morgen fragt die App, ob sie sich erfüllt hat.

**Datenmodell** (neue Tabelle in `models.py`):
```python
class Intention(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    date: dt.date = Field(index=True)          # Abend-Datum
    text: str                                   # „Was willst du träumen?“
    fulfilled: bool | None = None               # None = noch offen
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)
```

**API** (in `main.py`, auf dem geschützten `router`):
- `GET /api/intentions/current` → jüngste Intention mit `fulfilled == None`
  (oder `null`). Zusatzfeld im Response: `is_today` (bool).
- `POST /api/intentions` `{text}` → legt Intention für heute an; existiert für
  heute schon eine offene, wird deren Text überschrieben (kein Duplikat).
- `PATCH /api/intentions/{id}` `{fulfilled: true|false}` → abschließen.
- `GET /api/stats` erweitern: `incubation: {total: N, fulfilled: N, rate: %}`
  über alle abgeschlossenen Intentionen.

**UI:**
1. Header: neben der Tab-Leiste ein Mond-Button (🌙). Klick öffnet das
   **Abendritual als Overlay** (Muster: Login-Overlay in `index.html`/`auth.js`),
   Inhalt:
   - „Dein Fokus-Zeichen: …“ (aus `/api/stats` → `focus_sign`, falls vorhanden)
   - Bucket-List-Vorschau (ab Stufe 2; bis dahin weglassen)
   - Textfeld „Was willst du heute Nacht träumen?“ + Speichern-Button
   - Nach dem Speichern: bestätigender Zustand („Absicht gesetzt. Guten Flug. 🌙“)
2. **Morgen-Rückfrage:** Öffnet der Nutzer das Neuer-Traum-Formular
   (`journal.openForm`) und es existiert eine offene Intention von gestern
   oder heute, erscheint über dem Formular eine Karte:
   *„Deine Absicht war: ‚…‘ — hat es geklappt?“* mit Buttons
   **Ja ✓ / Nein ✗ / Später**. Ja/Nein → PATCH; Später → Karte schließen,
   Intention bleibt offen.
3. Analyse-Tab: neue Kennzahl-Karte „Inkubations-Quote“ (nur zeigen, wenn
   `incubation.total > 0`).

**Akzeptanzkriterien:**
- [ ] Abends Absicht speichern, App neu laden → 🌙-Overlay zeigt die gespeicherte Absicht
- [ ] Neuer-Traum-Formular zeigt die Rückfrage; „Ja" setzt fulfilled und die Karte verschwindet
- [ ] Inkubations-Quote erscheint in der Analyse und rechnet korrekt
- [ ] Ohne Anmeldung: alle neuen Endpunkte antworten 401

---

### Stufe 2: Klartraum-Bucket-List

**Ziel:** Ziele für den nächsten Klartraum sammeln, abends lesen, nach Erfolg abhaken.

**Datenmodell:**
```python
class Goal(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    text: str
    done: bool = False
    done_at: dt.datetime | None = None
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)
```

**API:** `GET /api/goals` (offene zuerst, dann erledigte nach done_at absteigend),
`POST /api/goals` `{text}`, `PATCH /api/goals/{id}` `{done}` (setzt/löscht done_at),
`DELETE /api/goals/{id}`.

**UI:**
- Lernen-Tab: neue Karte „🏆 Klartraum-Bucket-List“ ganz oben: Eingabefeld +
  Liste (offene mit Checkbox, erledigte durchgestrichen mit Datum, Löschen-Knopf).
- Abendritual-Overlay (Stufe 1): zeigt bis zu 3 offene Ziele als Erinnerung
  („Nimm dir eins mit in den Traum“).

**Akzeptanzkriterien:**
- [ ] Ziel anlegen, abhaken, wieder aufmachen, löschen — alles ohne Reload sichtbar
- [ ] Abendritual zeigt offene Ziele
- [ ] 401 ohne Token

---

### Stufe 3: Rotlicht-Modus

**Ziel:** Melatonin-freundliches Theme für nächtliche Nutzung (WBTB).

**Umsetzung (nur Frontend):**
- `css/style.css`: Selektor `[data-theme="night"]` auf `<html>` überschreibt die
  CSS-Variablen: Hintergründe fast schwarz (`#0d0505`, Karten `#1a0e0e`),
  Text gedämpftes Rot/Bernstein (`#e0a080`, dim `#8a5f50`), Akzent `#c96a4a`,
  keine blauen/violetten Töne. Diagramm-Farben dürfen unverändert bleiben.
- Umschalter: Button 🔴/☀️ im Header neben dem 🌙-Button. Zustand in
  `localStorage["theme"]`, beim Laden in `app.js` anwenden.
- Das Abendritual-Overlay (Stufe 1) bekommt einen Hinweis-Link „Rotlicht an“.
- `<meta name="theme-color">` dynamisch mitsetzen.

**Akzeptanzkriterien:**
- [ ] Umschalten wirkt sofort auf alle Tabs und übersteht Reload
- [ ] Kein UI-Element bleibt unlesbar (Kontrast prüfen: Formulare, Badges, Overlays)

---

### Stufe 4: Sprachnotizen am Eintrag

**Ziel:** Morgens murmeln statt tippen. Aufnahme hängt am Traum.

**Datenmodell:** Migration in `_migrate()`: `ALTER TABLE dream ADD COLUMN audio_path VARCHAR`.

**Backend:**
- Ablage: `backend/audio/` (Ordner anlegen, in `.gitignore` aufnehmen).
- `POST /api/dreams/{id}/audio` — multipart Upload (`UploadFile`), speichert als
  `backend/audio/{dream_id}.webm`, setzt `audio_path`. Vorherige Datei ersetzen.
- `GET /api/dreams/{id}/audio` — `FileResponse`, nur mit gültigem Token.
  **Achtung:** `<audio src>` kann keine Header setzen → Frontend lädt per
  fetch+Blob-URL (Muster: `stats.downloadExport`).
- `DELETE /api/dreams/{id}/audio` — Datei + Pfad entfernen. Beim Löschen eines
  Traums (`delete_dream`) Audiodatei mitlöschen.
- `DreamOut`: Feld `has_audio: bool`.

**Frontend (`journal.js`):**
- Im Formular: Aufnahme-Zeile mit ● Aufnehmen / ■ Stopp (MediaRecorder,
  `audio/webm`), Laufzeitanzeige, Abspielen-Vorschau, Verwerfen.
  Upload nach dem Speichern des Traums (erst Traum-POST/PUT, dann Audio-POST).
- In der Traumkarte: ▶-Button, wenn `has_audio` (fetch → Blob → `Audio`).
- **Einschränkung dokumentieren:** `getUserMedia` braucht HTTPS oder localhost.
  Auf `http://<LAN-IP>` (Pixel) die Aufnahme-UI ausblenden mit Hinweis
  „Sprachnotizen brauchen HTTPS – siehe README (mkcert)“.
  Erkennung: `navigator.mediaDevices === undefined`.
- Offline-Fall: Wenn der Traum in der Outbox landet (Server aus), Audio in
  dieser Version NICHT puffern — Aufnahme-UI im Offline-Zustand deaktivieren
  (Hinweistext). (Bewusste Vereinfachung.)

**Akzeptanzkriterien:**
- [ ] Aufnehmen → Speichern → ▶ in der Karte spielt die Aufnahme (localhost)
- [ ] Traum löschen entfernt die Audiodatei vom Datenträger
- [ ] Audio-GET ohne Token → 401

---

### Stufe 5: Morgen-Flow

**Ziel:** Geführtes Erfassen: erst erinnern, dann schreiben.

**Umsetzung (nur Frontend, `journal.js`):**
- Einstellung „🧘 Morgen-Flow“ (an/aus) als kleine Checkbox-Zeile im
  Lernen-Tab bei der Erinnerungs-Karte; `localStorage["morning-flow"]`.
- Ist sie an und wird „+ Neuer Traum“ getippt: Vollbild-Overlay, sehr dunkel:
  *„Bleib still. Geh den Traum rückwärts durch. 60 s“* mit Countdown-Ring
  und Button „Ich bin bereit →“ (überspringt). Danach öffnet das Formular
  mit Fokus im Inhaltsfeld (bestehendes Verhalten).
- Countdown-Ende: sanfter Übergang, kein Ton.

**Akzeptanzkriterien:**
- [ ] An/aus wirkt sofort; Überspringen jederzeit möglich
- [ ] Rotlicht-Modus (Stufe 3) gilt auch im Overlay

---

### Stufe 6: Die Traumweltkarte  *(Horizont 2, das große Ding)*

**Ziel:** Aus dem Atlas-Netz wird eine **vom Nutzer selbst gelegte Landkarte**:
Orte platzieren, Wege ziehen, Unerforschtes liegt im Nebel. Zweck: mentale
Karte der Traumwelt aufbauen (Tholey) → Wiedererkennen im Traum → Luzidität.

**Datenmodell** (zwei neue Tabellen; nur `kind == "place"`-Tags sind kartierbar):
```python
class MapNode(SQLModel, table=True):
    tag_id: int = Field(foreign_key="tag.id", primary_key=True)
    x: float  # 0..1 relativ zur Kartenbreite
    y: float  # 0..1 relativ zur Kartenhöhe

class MapPath(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    from_tag_id: int = Field(foreign_key="tag.id", index=True)
    to_tag_id: int = Field(foreign_key="tag.id", index=True)
    note: str | None = None   # z. B. „durch den Flur der alten Schule“
```

**API:**
- `GET /api/map` →
  ```json
  {
    "placed":   [{"tag_id":1,"name":"elternhaus","x":0.3,"y":0.7,"dream_count":5,"lucid_count":1}],
    "unplaced": [{"tag_id":9,"name":"leuchtturm","dream_count":2}],
    "paths":    [{"id":1,"from_tag_id":1,"to_tag_id":9,"note":null}]
  }
  ```
  (`unplaced` = place-Tags mit `dream_count > 0` ohne MapNode.)
- `PUT /api/map/nodes/{tag_id}` `{x, y}` → platzieren/verschieben (upsert;
  validieren: 0 ≤ x,y ≤ 1; Tag muss `kind == "place"` sein, sonst 400).
- `DELETE /api/map/nodes/{tag_id}` → von der Karte nehmen (zugehörige Pfade mitlöschen).
- `POST /api/map/paths` `{from_tag_id, to_tag_id, note?}` (beide platziert,
  sonst 400; Duplikate in beliebiger Richtung → 409).
- `DELETE /api/map/paths/{id}`.

**UI — neues Modul `frontend/js/worldmap.js`** (in `index.html` + `sw.js` SHELL
eintragen, Cache-Version bumpen):

1. **Umschalter im Atlas-Tab:** Segmented Control oben: „🕸️ Netz | 🗺️ Karte“.
   „Netz“ = bestehende atlas.js-Ansicht, „Karte“ = die neue Weltkarte.
   Zustand in `localStorage["atlas-view"]`.
2. **Leinwand:** SVG, `viewBox="0 0 1000 700"`, Höhe responsiv. Hintergrund:
   dunkle „Pergament bei Nacht“-Fläche (Radialverlauf, feine Rasterpunkte —
   nur CSS/SVG, keine Bilder).
3. **Orte platzieren:** Unter der Karte eine Ablage **„Unkartierte Orte“**
   (Chips). Interaktion mobiltauglich in zwei Schritten: Chip antippen
   (Auswahl-Zustand) → auf die Karte tippen = platzieren (PUT). Platzierte
   Orte: Kreis (Radius wächst mit `dream_count`, Muster siehe `atlas.js`)
   + Name darunter. **Verschieben** per Pointer-Drag
   (`pointerdown/move/up` + `setPointerCapture` — funktioniert für Maus & Touch);
   beim Loslassen PUT.
4. **Wege:** Werkzeugleiste über der Karte: Modus „🚶 Weg“ — zwei Orte
   nacheinander antippen → POST, Linie erscheint (gestrichelt, `--text-dim`).
   Weg antippen im Weg-Modus → Lösch-Bestätigung. Modus „✋ Bewegen“ ist Default.
5. **Nebel des Unerforschten:** SVG-`<mask>`: dunkle, halbtransparente
   Nebelfläche über der ganzen Karte; um jeden platzierten Ort ein weicher
   Lichtkreis (`<circle>` mit Blur-Filter im Mask), Radius ~90 + 15×min(dream_count,6).
   Effekt: Karte „lichtet sich“, wo Träume sind. Nebel liegt ÜBER dem
   Hintergrund, aber UNTER Knoten/Wegen/Labels.
6. **Orts-Steckbrief:** Ort antippen (im Bewegen-Modus, ohne Drag) → Karte
   unter der Leinwand (Muster `atlas.showSeries`): Name, Anzahl Träume,
   davon luzide, verbundene Wege, Traumliste (Titel/Datum/Luzidität-Badge).
   Button „Von der Karte entfernen“.
7. **Leerzustand:** Keine platzierten Orte → Erklärtext auf der Leinwand:
   *„Tippe einen Ort in der Ablage an und dann auf die Karte — deine Traumwelt
   beginnt hier.“*

**Akzeptanzkriterien:**
- [ ] Ort platzieren, verschieben, entfernen — überlebt Reload (persistiert)
- [ ] Weg anlegen zwischen zwei Orten, Duplikat wird abgelehnt, Weg löschen geht
- [ ] Nebel lichtet sich um platzierte Orte, wächst mit dream_count
- [ ] Steckbrief zeigt korrekte Träume (Abgleich mit Tagebuch)
- [ ] Bedienbar mit Touch im 412-px-Viewport (Zwei-Schritt-Platzieren, Drag)
- [ ] Alle neuen Endpunkte: 401 ohne Token; PUT validiert Grenzen und Tag-Art
- [ ] Netz-Ansicht (atlas.js) funktioniert unverändert

---

## Teil C — Abschluss jeder Stufe

1. Manuell verifizieren (Desktop + 412 px), Testdaten restlos entfernen.
2. `sw.js`: Cache-Version gebumpt? Neue Dateien in SHELL?
3. Ein Commit pro Stufe (deutsche Nachricht, was & warum).
4. `README.md` ergänzen, falls Nutzer-sichtbares Verhalten dazukam
   (z. B. Sprachnotizen-HTTPS-Hinweis).

**Nach Stufe 6:** `ROADMAP.md` aktualisieren (Erledigtes abhaken). Nächste
Kandidaten laut Roadmap: mkcert/HTTPS, Emotionen als Dimension, Orts-Steckbriefe
vertiefen (Emotionen), Traumfiguren-Lexikon.
