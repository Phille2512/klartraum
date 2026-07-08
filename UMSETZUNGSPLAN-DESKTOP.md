# 📦 Umsetzungsplan „Desktop-Paket": Ein-Klick-App für Freunde

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Konventionen, Fallstricke) und
> `docs/ARCHITEKTUR.md`. Kontext: `docs/VERTEILUNG.md`.

**Ziel:** Freunde installieren Klartraum per Doppelklick — ohne Terminal,
Python oder Git. Die Daten bleiben eine **echte SQLite-Datei auf ihrem Gerät**
(kein Browser-Speicher, keine Cloud). Verteilung über GitHub Releases, 0 €.

**Gewählte Technik:** PyInstaller (bündelt den bestehenden Python-Server +
Frontend in eine ausführbare Datei). Bewusst NICHT Tauri/Electron: das Backend
ist Python — ein Rewrite lohnt erst für die spätere Local-First-PWA
(Stufe 2 in `docs/VERTEILUNG.md`, separater Plan bei Bedarf).

**Entscheidungen:**
- Datenordner: **`~/Klartraum/`** (sichtbar im Home-Verzeichnis — bewusst kein
  verstecktes AppData: Nutzer sollen ihre Daten sehen und kopieren können).
- Die App läuft als **sichtbares Konsolenfenster** („Fenster schließen beendet
  Klartraum") — transparent, plattformübergreifend gleich, kein Tray-Gefrickel.
- Builds pro Betriebssystem via **GitHub Actions** (kein Cross-Compiling nötig).

---

## Stufe D.1: Datenpfade entkoppeln

**Problem:** `dreams.db`, `auth.json` und `audio/` liegen heute neben dem Code
(`backend/`). Im PyInstaller-Bundle ist dieser Ort schreibgeschützt und wird
bei Updates ersetzt — Datenverlust.

**Umsetzung:**
- Neues Modul `backend/paths.py`:
  ```python
  import os
  from pathlib import Path

  DATA_DIR = Path(os.environ.get("KLARTRAUM_DATA", Path.home() / "Klartraum"))
  DATA_DIR.mkdir(parents=True, exist_ok=True)
  ```
- `database.py`, `auth.py` und die Audio-Ablage nutzen `paths.DATA_DIR`
  statt `Path(__file__).parent`.
- **Einmalige Migration** beim Start (in `init_db`): Existiert die alte
  `backend/dreams.db`, aber noch keine `DATA_DIR/dreams.db` → Dateien
  (`dreams.db`, `auth.json`, `audio/`) **kopieren** (nicht verschieben; Log-Zeile
  ausgeben). So verliert Philipps bestehende Installation nichts.
- Frontend-Pfad im Bundle: PyInstaller entpackt Daten nach `sys._MEIPASS` —
  in `main.py`:
  ```python
  FRONTEND_DIR = Path(getattr(sys, "_MEIPASS", Path(__file__).parent.parent)) / "frontend"
  ```
  (Im Dev-Betrieb unverändert `../frontend`.)

**Akzeptanz:** Dev-Start funktioniert wie bisher; mit `KLARTRAUM_DATA=/tmp/kt-test`
entsteht dort eine frische DB; bestehende Daten werden beim ersten Start
übernommen (mit Testkopie prüfen, nicht mit der echten DB experimentieren).

## Stufe D.2: Launcher

Neues `backend/desktop.py`:
- Freien Port finden (8000, sonst 8001 …), uvicorn **programmatisch** starten
  (`uvicorn.run(app, host="0.0.0.0", port=port)` in einem Thread).
- Konsole zeigt (deutsch, mit etwas Charme):
  ```
  🌙 Klartraum läuft!
     Am Computer:  http://localhost:8000
     Am Handy:     http://192.168.x.x:8000  (gleiches WLAN)
     Deine Daten:  /Users/xyz/Klartraum/dreams.db
     Dieses Fenster schließen beendet Klartraum.
  ```
  (LAN-IP über `socket`-Trick: UDP-Socket zu 8.8.8.8 öffnen, `getsockname()`.)
- Nach Serverstart `webbrowser.open("http://localhost:<port>")`.
- Strg+C / Fenster schließen beendet sauber.

**Akzeptanz:** `python backend/desktop.py` startet Server + öffnet Browser;
Port-Kollision (zweiter Start) weicht auf 8001 aus und öffnet die richtige URL.

## Stufe D.3: Build & Verteilung über GitHub

1. `requirements-dev.txt` mit `pyinstaller`.
2. `klartraum.spec` (eincheckbar): Onefile-Build von `backend/desktop.py`,
   `--add-data frontend:frontend`, Name `Klartraum`, `console=True`,
   Icon aus `frontend/icons/icon-512.png` (Mac: .icns / Windows: .ico beim
   Build erzeugen oder vorab committen).
3. Lokaler Test-Build: `pyinstaller klartraum.spec` → `dist/Klartraum`
   per Doppelklick testen (macOS: Rechtsklick → Öffnen wegen Gatekeeper).
4. **GitHub Actions** `.github/workflows/release.yml`: bei Tag `v*` auf
   `macos-latest`, `windows-latest`, `ubuntu-latest` bauen und als
   **Release-Assets** hochladen: `Klartraum-mac.zip`, `Klartraum-windows.zip`,
   `Klartraum-linux.zip`. (Actions sind für öffentliche Repos kostenlos.)
5. Repo-Hygiene vor dem ersten Push prüfen: `.gitignore` deckt `dreams.db`,
   `auth.json`, `certs/`, `.venv/`, `dist/`, `build/` ab; `git log` ist sauber.
   `LICENSE` (MIT) ergänzen.

**Akzeptanz:** Tag pushen → Release mit drei Zips erscheint automatisch;
Mac-Zip auf einem zweiten Benutzerkonto (oder frischem Ordner mit leerem
`KLARTRAUM_DATA`) durchspielen: entpacken → öffnen → Passwort setzen →
Traum speichern → Neustart → Traum noch da.

## Stufe D.4: Daten-Transparenz in der App

Damit Nutzer verstehen, wo ihre Daten liegen — und was das bedeutet:

- Neuer Endpunkt `GET /api/datainfo` → `{data_dir, db_file, db_size_bytes,
  dream_count, last_backup_hint: null}`.
- **Lernen-Tab, neue Karte „🔐 Deine Daten“** (ganz unten):
  - Speicherort als Pfad + Größe („Deine 214 Träume: 1,2 MB in
    `~/Klartraum/dreams.db`“)
  - Klartext-Absatz (siehe Textbaustein unten)
  - Buttons: „📤 Backup jetzt (JSON)“ (bestehender Export) und
    „Ordner-Pfad kopieren“.
- **Erster Start** (einmalig, `localStorage["hint-daten"]`): kleine
  Hinweis-Karte nach dem Passwort-Setup mit demselben Textbaustein.

**Textbaustein (verbindlich, auch für die Anleitung):**
> **Deine Träume gehören dir — wörtlich.** Alles, was du hier einträgst,
> liegt ausschließlich in einer Datei auf DIESEM Gerät
> (`~/Klartraum/dreams.db`). Keine Cloud, kein Konto, niemand liest mit.
> Die Kehrseite dieser Freiheit: **Geht das Gerät verloren oder kaputt, sind
> die Träume weg — es sei denn, du hast ein Backup.** Ein Backup ist eine
> Kopie dieser einen Datei oder ein Export (Analyse → Datenexport). Mach das
> regelmäßig — dein zukünftiges Ich dankt dir.

**Akzeptanz:** Karte zeigt echten Pfad/Zahlen; Erststart-Hinweis erscheint
genau einmal; Export-Button funktioniert von dort.

## Stufe D.5: Anleitung für Freunde

Neue Datei `ANLEITUNG-FUER-FREUNDE.md` im Repo-Root (wird auch im Release
verlinkt). Inhalt (Implementierer übernimmt und ergänzt die echte Release-URL):

```markdown
# 🌙 Klartraum installieren — in 3 Minuten

Klartraum ist ein privates Traumtagebuch zum Klarträumen-Lernen.
Es läuft komplett auf deinem Computer — kostenlos, ohne Konto, ohne Cloud.

## 1. Herunterladen
→ https://github.com/<user>/<repo>/releases/latest
Lade das Paket für dein System: Klartraum-mac.zip / Klartraum-windows.zip

## 2. Starten
- **Mac:** Zip entpacken → RECHTSKLICK auf „Klartraum“ → „Öffnen“ → nochmal
  „Öffnen“. (Der Warnhinweis kommt, weil die App nicht bei Apple registriert
  ist — sie ist quelloffen, du kannst den Code auf GitHub lesen.)
- **Windows:** Zip entpacken → Doppelklick auf „Klartraum.exe“ → falls
  SmartScreen warnt: „Weitere Informationen“ → „Trotzdem ausführen“.
- Es öffnet sich ein schwarzes Fenster (das ist der Motor — nicht schließen,
  solange du die App nutzt) und dein Browser mit Klartraum.

## 3. Passwort setzen
Beim ersten Start legst du ein Passwort fest. Es schützt dein Tagebuch vor
anderen Personen in deinem Netzwerk. **Merk es dir** — zurücksetzen geht nur,
indem du die Datei `auth.json` im Klartraum-Ordner löschst.

## 4. Aufs Handy bringen (optional)
Handy ins gleiche WLAN, im schwarzen Fenster steht eine Adresse wie
`http://192.168.1.23:8000` — die am Handy in Chrome öffnen, anmelden,
Menü → „Zum Startbildschirm hinzufügen“. Fertig: App-Icon auf dem Handy.
(Funktioniert nur, solange Klartraum auf deinem Computer läuft.)

## 🔐 Wo sind meine Daten — und was ist das Risiko?
[→ Textbaustein aus Stufe D.4 einfügen]

**Faustregel: Einmal pro Woche sichern.** Entweder in der App
(Analyse → „JSON exportieren“) oder den Ordner `Klartraum` in deinem
Home-Verzeichnis kopieren. Zwei Klicks, nie wieder Herzschmerz.

## Beenden & Deinstallieren
Beenden: das schwarze Fenster schließen. Deinstallieren: App-Datei löschen —
deine Daten bleiben in `~/Klartraum/` (auch löschen, wenn wirklich alles weg soll).

*Privates Hobbyprojekt, Nutzung auf eigene Verantwortung — kein Medizinprodukt,
kein Therapieersatz. Viel Spaß beim Träumen! 🌙*
```

**Akzeptanz:** Anleitung liegt im Repo, Release-Beschreibung verlinkt sie;
ein technisch unbedarfter Testleser (Philipp spielt Freund) kommt ohne
Rückfragen durch.

---

## Reihenfolge & Abschluss

```
D.1 Pfade → D.2 Launcher → D.3 Build/Release → D.4 Transparenz → D.5 Anleitung
```

Pro Stufe: verifizieren, Testdaten löschen, committen (deutsche Message).
**Besondere Vorsicht bei D.1:** Vor dem ersten Start mit neuem Pfad-Code eine
Sicherungskopie von `backend/dreams.db` anlegen. Nach D.5: `README.md` um den
Releases-Link ergänzen, `docs/VERTEILUNG.md` Status aktualisieren.
