# 🏗️ Systemarchitektur

*Stand: Juli 2026. Bei Änderungen am Datenmodell oder an den API-Gruppen bitte
dieses Dokument mitpflegen.*

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

- **Backup = eine Datei:** `backend/dreams.db` kopieren (bei gestopptem Server)
  oder Export (JSON/CSV) aus der Analyse. `auth.json` mitkopieren, wenn
  Tokens/Passwort erhalten bleiben sollen.
- **Passwort vergessen:** `backend/auth.json` löschen → App fragt beim nächsten
  Öffnen nach einem neuen Passwort. Traumdaten bleiben unberührt.
- **Frontend-Update wird nicht sichtbar:** Cache-Version in `sw.js` bumpen
  (Konvention!) und zweimal neu laden.
- **Bekannte Grenzen:** Statistik/Atlas laden alle Träume in den Speicher
  (unkritisch bis ~10.000 Einträge); keine Nutzertrennung; keine automatischen
  Backups; keine Testsuite (Verifikation manuell im Browser).

Weitere Pflichtlektüre für Implementierer: `UMSETZUNGSPLAN.md` Teil A
(Konventionen & Fallstricke), `ROADMAP.md` (Vision).
