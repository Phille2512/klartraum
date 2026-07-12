# 🛡️ Umsetzungsplan „Sicherheitsnetz": Backups, Tests, tragfähiges Fundament

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Konventionen, Fallstricke)
> und `docs/ARCHITEKTUR.md`.
>
> **Warum dieser Plan vor allen weiteren Features kommt:** Traumader verwahrt
> unwiederbringliche, intime Daten und ist auf ~45 Endpunkte gewachsen — ohne
> automatische Backups und ohne Testsuite. Zwei echte Vorfälle (500er beim
> Bearbeiten; Atlas-Regression durch Filter/Labels) wären mit Tests sofort
> gefangen worden. Dieser Plan hat **höchste Priorität** und wird vor allen
> anderen offenen Plänen umgesetzt.

**Grundregel für diesen Plan:** Kein Schritt darf die echte Datenbank
anfassen. Vor Beginn von S.1 eine manuelle Sicherungskopie der `dreams.db`
anlegen und beiseitelegen.

---

## Stufe S.1: Automatische Backups  *(höchster Mehrwert pro Minute)*

**Verhalten:**
- Bei jedem Serverstart (in `lifespan`, VOR `init_db`/Migrationen): Liegt für
  heute noch kein Backup vor → Snapshot nach
  `DATA_DIR/backups/dreams-YYYY-MM-DD.db`.
- **Sicher gegen laufende Schreibzugriffe:** die SQLite-Backup-API verwenden
  (`sqlite3.connect(src).backup(dst)`), niemals naives Datei-Kopieren einer
  potenziell offenen DB.
- **Rotation:** die letzten 14 Tages-Backups behalten; zusätzlich je das
  erste Backup eines Monats für 6 Monate (Langzeit-Anker). Alles Ältere
  löschen. Rotation läuft nach jedem erfolgreichen Snapshot.
- **Vor Migrationen extra:** Wenn `_migrate()` tatsächlich ein `ALTER TABLE`
  ausführen wird, vorher einen Snapshot `dreams-pre-migration-YYYY-MM-DD.db`
  anlegen (zählt nicht zur Rotation).
- Fehler beim Backup dürfen den Serverstart NICHT verhindern — loggen,
  weiterlaufen, aber in der UI sichtbar machen (siehe unten).

**Sichtbarkeit:**
- `GET /api/datainfo` erweitern: `last_backup` (Datum), `backup_count`,
  `backup_dir`.
- „🔐 Deine Daten“-Karte zeigt: „Letztes automatisches Backup: heute ·
  14 Stände aufbewahrt“ — bzw. Warnhinweis, wenn das letzte Backup > 3 Tage
  alt ist oder fehlschlug.
- `docs/HANDBUCH.md`, FAQ „Backup?“ ergänzen: automatische Snapshots +
  **Wiederherstellung**: Server stoppen, gewünschte Datei aus
  `backups/` als `dreams.db` zurückkopieren, starten.

**Akzeptanz:**
- [ ] Zwei Starts am selben Tag erzeugen genau ein Backup
- [ ] Rotation mit künstlich angelegten Alt-Dateien geprüft (Tages- und Monatslogik)
- [ ] **Restore einmal wirklich durchgespielt** (mit Testdaten-DB): Datei
      zurückkopiert, App zeigt den alten Stand — ein Backup ohne Restore-Test
      ist keins
- [ ] Backup-Ordner ist git-ignoriert

## Stufe S.2: Testsuite  *(das eigentliche Netz)*

**Aufbau:**
- `requirements-dev.txt`: `pytest`, `httpx`.
- `tests/conftest.py`:
  - Fixture setzt `KLARTRAUM_DATA` auf ein Temp-Verzeichnis **bevor**
    Backend-Module importiert werden (die Pfad-Logik in `paths.py` ist
    env-basiert — genau dafür). Dadurch ist die **echte DB physisch
    unerreichbar** für Tests.
  - Frische DB pro Testmodul; `client`-Fixture (FastAPI `TestClient`) und
    `auth_client`-Fixture (Passwort via `/api/auth/setup` gesetzt, Token im
    Header).
- `tests/`-Gliederung nach API-Gruppen: `test_auth.py`, `test_dreams.py`,
  `test_tags.py`, `test_stats.py`, `test_atlas_map.py`, `test_jung.py`
  (Reflexionen, Imaginationen, Traum-Analyse, Symbolnotizen, Sync-Events),
  `test_cycle.py` (Goals, Intentions), `test_export_import.py`,
  `test_backup.py` (S.1-Logik!).

**Pflicht-Testfälle (neben Happy-Paths pro Endpunkt):**
1. **Regressionstest 500er:** Traum anlegen und per PUT mit `places`/
   `persons`/`emotions` ändern → 200 und Felder korrekt (der historische Bug).
2. **Regressionstest Routen-Reihenfolge:** `GET /api/dreams/echoes?text=…`
   liefert 200 (nicht 422 durch `{dream_id}`-Kollision).
3. **401-Matrix:** jeder geschützte Endpunkt ohne Token → 401 (eine
   parametrisierte Testfunktion über eine Routenliste).
4. **Validierung:** unbekannte Emotion → 422; lucidity 7 → 422;
   Archetyp auf Nicht-Person → 400.
5. **Löschkaskaden:** Traum löschen entfernt DreamTag-Verknüpfungen und
   Audio-Datei (falls Sprachnotizen umgesetzt sind).
6. Stats rechnen korrekt gegen einen kleinen, handverifizierten Datensatz
   (3 Träume, bekannte Quoten).

Zielgröße: **50–70 Tests**, Laufzeit < 30 s. Ausführen mit
`.venv/bin/pytest` — in README dokumentieren.

**Akzeptanz:**
- [ ] Suite grün; zweimal hintereinander (keine Reihenfolge-Abhängigkeiten)
- [ ] Echte `dreams.db` nachweislich unberührt (Zeitstempel/Größe vor/nach Lauf)
- [ ] `docs/ARCHITEKTUR.md`: „keine Testsuite“ aus den bekannten Grenzen
      streichen, Testlauf dokumentieren

## Stufe S.3: `main.py` in Module schneiden  *(jetzt gefahrlos dank S.2)*

`main.py` (>1.100 Zeilen) aufteilen — reine Umzugsarbeit, kein Verhalten ändern:

```
backend/
  main.py        – App-Factory, Middleware, Static Files, Router-Includes
  deps.py        – get_session, require_auth
  schemas.py     – Pydantic-Schemas
  helpers.py     – to_out, apply_tags, get_or_create_tag
  routers/
    auth.py  dreams.py  tags.py  stats.py  atlas.py  map.py
    cycle.py  jung.py  export.py
```

- Uvicorn-Startkommando bleibt `main:app` (Kompatibilität mit launch.json,
  Desktop-Launcher, README).
- Beim Umzug die Routen-Reihenfolge innerhalb `dreams.py` bewusst setzen:
  Statische Pfade (`/dreams/echoes`) VOR Parameter-Pfaden (`/dreams/{id}`) —
  mit Kommentar, warum.

**Akzeptanz:** Komplette Testsuite grün, App im Browser stichprobenartig
geprüft; kein Modul > 300 Zeilen.

## Stufe S.4: Betriebs-Robustheit

1. **Globaler Exception-Handler:** Unbehandelte Fehler → sauberes JSON
   `{"detail": "internal_error"}` (500) statt HTML-Traceback; vollständiger
   Traceback ins Server-Log. (Fehler-Codes passen zur späteren i18n-Stufe I.4.)
2. **`GET /api/health`** (ohne Auth): `{status: "ok", version: <hash>}` —
   für Start-Skripte und Neugier.
3. **Service-Worker-Version automatisieren — die Konvention abschaffen:**
   `/sw.js` wird durch eine FastAPI-Route ausgeliefert, die im Inhalt den
   Platzhalter `__VERSION__` durch einen beim Serverstart berechneten Hash
   über die mtimes aller `frontend/`-Dateien ersetzt. Ändert sich irgendeine
   Frontend-Datei, ändert sich `sw.js` → Browser installiert den neuen
   Worker automatisch. Das manuelle „Cache bumpen“ entfällt; Teil A des
   Basis-Plans entsprechend aktualisieren (Regel 1 ersetzen durch: „neue
   Frontend-Dateien in die SHELL-Liste eintragen — die Version verwaltet der
   Server“).
4. **Update-Routine dokumentieren** (README): Backup läuft automatisch beim
   Start; nach `git pull` → `pytest` → Server-Neustart.

**Akzeptanz:** Provozierter Fehler liefert JSON-500 + Log; Frontend-Änderung
führt ohne manuellen Bump nach zwei Reloads zur neuen Version; health-Check
antwortet ohne Token.

---

## Reihenfolge & Grundsätze

```
S.1 Backups → S.2 Testsuite → S.3 Modul-Schnitt → S.4 Robustheit
```

- S.1 zuerst: Ab dann ist jeder weitere Schritt dieses Plans (und jedes
  künftigen Plans) durch tägliche Snapshots abgesichert.
- S.3 niemals vor S.2 — der Refactor ist nur mit grüner Suite gefahrlos.
- **Neue Dauer-Konvention** (in `UMSETZUNGSPLAN.md` Teil A ergänzen):
  *„10. Jede Stufe jedes Plans endet mit grüner Testsuite; neue Endpunkte
  bringen ihre Tests mit."*
- Dieser Plan geht **vor** die noch offenen Pläne (HILFE-Rest, TRAUMADER,
  I18N) — die profitieren alle von Netz und Snapshot.
