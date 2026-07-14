# 🏗️ Systemarchitektur

*Stand: Juli 2026. Bei Änderungen am Datenmodell oder an den API-Gruppen bitte
dieses Dokument mitpflegen.*

> 📖 Verständliche Einführung ohne Vorwissen zu Backups/Tests/Modul-Aufteilung:
> siehe `docs/SICHERHEITSNETZ-ERKLAERT.md`.

## Überblick

```
┌─────────────────────────── Browser (Mac / Pixel) ───────────────────────────┐
│  index.html (Single Page, 4 Tabs + Overlays)                                │
│  js/: app · auth · api · journal · offline · stats · atlas · worldmap       │
│       innenwelt · mandala · learn · wissen                                  │
│  sw.js (Service Worker: Netz zuerst, Cache-Fallback)   Chart.js (CDN)       │
└───────────────┬──────────────────────────────────────────────────────────────┘
                │ HTTP(S), JSON  ·  Authorization: Bearer <token>
┌───────────────▼──────────────────────────────────────────────────────────────┐
│  FastAPI (backend/main.py)                                                   │
│  · /api/auth/* (offen)  · alle anderen /api/* über router mit require_auth   │
│  · Cache-Control-Middleware (no-cache für Frontend-Dateien)                  │
│  · StaticFiles: liefert frontend/ aus (zuletzt gemountet)                    │
├───────────────────────────────────────────────────────────────────────────────┤
│  SQLModel/SQLAlchemy  →  SQLite: backend/dreams.db (eine Datei = alle Daten) │
│  Auth-Zustand: backend/auth.json (Passwort-Hash + Geräte-Tokens)             │
└───────────────────────────────────────────────────────────────────────────────┘
```

Ein Prozess, keine externen Dienste. Start:
`.venv/bin/uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000`

## Authentifizierung

- Ein gemeinsames Passwort (Einzelnutzer-App). PBKDF2-Hash in `auth.json`.
- Login liefert ein zufälliges Token; max. 10 Tokens (Geräte) gleichzeitig,
  das älteste fällt raus. Frontend speichert es in `localStorage["auth-token"]`.
- 401 → `auth.js` öffnet das Login-Overlay; `api.js` markiert Fehler mit
  `isAuthError` (Offline-Outbox verwirft dann nichts).
- **Wichtig:** Es gibt keine Nutzertrennung — alle mit Passwort sehen dieselben
  Daten. Für Freunde: siehe `docs/VERTEILUNG.md`.

## Datenmodell (SQLite)

| Tabelle | Zweck | Wichtige Felder |
|---|---|---|
| `dream` | Ein Traum | date, title, content, lucidity (0–4), sleep_quality (1–5), beifuss, big_dream, emotions (kommagetrennte Schlüssel), notes_analysis |
| `tag` | Wiederverwendbares Element | name, kind (`tag` \| `dream_sign` \| `place` \| `person`), category (LaBerge, nur dream_sign), archetype (Jung, nur person) |
| `dreamtag` | n:m Traum↔Tag | dream_id, tag_id |
| `mapnode` | Position eines Ortes auf der Traumweltkarte | tag_id (PK), x, y (0..1) |
| `mappath` | Weg zwischen zwei Orten | from_tag_id, to_tag_id, note |
| `goal` | Klartraum-Bucket-List | text, done, done_at |
| `intention` | Abendliche Traumabsicht | date, text, fulfilled (null = offen) |
| `reflection` | Antwort auf Reflexionsfrage zu einem Traum | dream_id, question, answer |
| `symbolnote` | Persönliche Assoziation zu einem Tag (Amplifikation) | tag_id, text |
| `imagination` | Aktive Imagination zu einem Traum | dream_id, text |
| `journeystep` | *(T.2: aus der UI entfernt, Tabelle bleibt unangetastet)* ehem. Fortschritt der allgemeinen Individuationsreise | station, note, completed_at |
| `dreamanalysis` | Individuationsreise auf Traumebene: Antwort je Station (aktive Variante) | dream_id, station, answer |
| `syncevent` | Synchronizität: Wachereignis zu einem Traum | dream_id?, date, text |
| `night` | Schlafzeit einer Nacht (N.1, eigene Entität — mehrere Träume pro Nacht möglich) | date (PK, = Traum-Datum), bed_time/wake_time (HH:MM, nur bei confidence="exact"), sleep_minutes (serverseitig abgeleitet), confidence (`exact` \| `rough` \| `unknown`) |

**Emotions-Vokabular** (12, definiert in `journal.js::EMOTIONS`, als
kommagetrennte Schlüssel in `dream.emotions`): angst, freude, staunen, trauer,
wut, liebe, neugier, verwirrung, frieden, ekel, sehnsucht, scham.

**Migrationen:** `database.py::_migrate()` — neue Spalten per
`PRAGMA table_info` + `ALTER TABLE`; neue Tabellen erzeugt `create_all`
automatisch. Es gibt keine Down-Migrationen.

## API-Gruppen (alle unter `/api`, geschützt außer `auth/*`)

| Gruppe | Endpunkte |
|---|---|
| Auth | `GET auth/status`, `POST auth/setup`, `POST auth/login` |
| Träume | `GET/POST dreams`, `GET/PUT/DELETE dreams/{id}`, `GET dreams/echoes` |
| Tags | `GET tags`, `PUT tags/{id}/category`, `PUT tags/{id}/archetype`, `GET/POST tags/{id}/notes`, `DELETE symbol-notes/{id}` |
| Statistik | `GET stats` (Kennzahlen, Wochen, Kompass, Beifuß, Inkubation, Korrelationen), `GET mandala`, `GET export` |
| Atlas & Karte | `GET atlas`, `GET map`, `PUT/DELETE map/nodes/{tag_id}`, `POST/DELETE map/paths` |
| Innenwelt (Jung) | `GET innenwelt`, `GET/POST dreams/{id}/reflections`, `GET/POST dreams/{id}/imaginations`, `GET/POST dreams/{id}/analysis`, `GET/POST sync-events` (+ DELETEs) |
| Zyklus | `GET intentions/current`, `POST intentions`, `PATCH intentions/{id}`, `GET/POST/PATCH/DELETE goals` |
| Schlafzeit | `GET/PUT/DELETE nights/{date}`, `GET nights/latest-exact` (Formular-Vorbelegung), `GET nights/median-bedtime` (WBTB-Vorbelegung) |

Verbindliche Antwort-Formate: siehe Pydantic-Schemas in `main.py`
(`DreamIn`/`DreamOut` sind die wichtigsten).

## Frontend-Module

| Datei | Verantwortung |
|---|---|
| `app.js` | Tab-Wechsel, Theme (Rotlicht), Abendritual-Overlay, SW-Registrierung, Init |
| `auth.js` | Setup/Login-Overlay, Token-Verwaltung |
| `api.js` | fetch-Wrapper mit Auth-Header und Fehler-Markierung |
| `journal.js` | Tagebuch: Formular (inkl. Emotionen, ⭐, Echos), Liste, Suche; globale Helfer (escapeHtml, formatDate, todayISO, splitList, EMOTIONS) |
| `offline.js` | IndexedDB-Outbox + Auto-Sync neuer Träume |
| `stats.js` | Analyse: Karten, Diagramme, Traumkompass, Export |
| `atlas.js` | Netzwerk-Ansicht (SVG, Kräfte-Simulation), Traumserien |
| `worldmap.js` | Traumweltkarte: Platzieren, Wege, Nebel |
| `innenwelt.js` | Jung-Bühne: Archetypen-Mandala + Figuren-Dossier |
| `mandala.js` | Deterministischer Traum-Mandala-Generator + PNG-Export |
| `learn.js` | Guides, Jung-Kompendium, Reality-Check-Erinnerung, WBTB, Bucket-List |
| `wissen.js` | Kontextuelle 💡-Wissens-Momente |

## Betriebs-Wissen

- **Automatische Backups (S.1):** `backend/backup.py` legt bei jedem
  Serverstart höchstens ein Backup pro Tag an (`DATA_DIR/backups/dreams-YYYY-MM-DD.db`,
  via SQLite-Online-Backup-API — sicher gegen laufende Schreibzugriffe).
  Rotation: 14 Tages-Backups + je ein Monats-Anker für 6 Monate. Vor jeder
  echten Schema-Migration zusätzlich ein `dreams-pre-migration-*.db`-Snapshot
  (nie rotiert). Status/Warnung sichtbar in `GET /api/datainfo` und im
  Lernen-Tab („🔐 Deine Daten“).
- **Backup = eine Datei:** zusätzlich `dreams.db` kopieren (bei gestopptem
  Server) oder Export (JSON/CSV) aus der Analyse — schützt vor Geräteverlust,
  was das automatische Backup (gleiche Platte) nicht kann. `auth.json`
  mitkopieren, wenn Tokens/Passwort erhalten bleiben sollen.
- **Passwort vergessen:** `auth.json` (im Datenordner) löschen → App fragt
  beim nächsten Öffnen nach einem neuen Passwort. Traumdaten bleiben unberührt.
- **Frontend-Update wird nicht sichtbar (S.4: automatisiert):** `sw.js` wird
  über eine eigene Route ausgeliefert, die `__VERSION__` durch einen beim
  Serverstart aus den mtimes aller `frontend/`-Dateien berechneten Hash
  ersetzt — kein manuelles Bumpen mehr nötig, zweimal neu laden reicht.
  Neue Dateien müssen weiterhin in die `SHELL`-Liste in `sw.js` eingetragen
  werden.
- **`GET /api/health`** (S.4, ohne Auth): `{"status": "ok", "version": <hash>}`
  — derselbe Hash wie in `sw.js`, für Start-Skripte/Monitoring.
- **Fehlerbehandlung (S.4):** unbehandelte Fehler liefern sauberes JSON
  `{"detail": "internal_error"}` (500) statt HTML-Traceback; voller
  Traceback landet im Server-Log.
- **Bekannte Grenzen:** Statistik/Atlas laden alle Träume in den Speicher
  (unkritisch bis ~10.000 Einträge); keine Nutzertrennung.
- **Testsuite (S.2):** `pytest` unter `tests/` (135 Tests, Laufzeit < 12 s).
  `tests/conftest.py` setzt `KLARTRAUM_DATA` auf ein Temp-Verzeichnis, bevor
  Backend-Module importiert werden — die echte Datenbank ist damit für Tests
  physisch unerreichbar. Ausführen: `.venv/bin/pytest` (Projektwurzel).
  Vor jedem Test wird das Schema frisch aufgesetzt (keine Reihenfolge-
  Abhängigkeiten zwischen Tests).

Weitere Pflichtlektüre für Implementierer: `UMSETZUNGSPLAN.md` Teil A
(Konventionen & Fallstricke), `ROADMAP.md` (Vision).
