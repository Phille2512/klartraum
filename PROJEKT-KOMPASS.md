# 🧭 Projekt-Kompass — Traumader

> **Für jedes Modell und jeden Menschen, der an Traumader weiterarbeitet.**
> Dieses Dokument bündelt den Gesamtkontext: Stand, Reihenfolge,
> Entscheidungen und Arbeitsweise. Geschrieben im Juli 2026 als Übergabe
> aus den Planungs-Sessions mit Claude (Fable). Bei Widersprüchen gilt:
> neuere Commits > dieses Dokument > ältere Pläne.

## Was Traumader ist

Ein privates Traumtagebuch zum Klarträumen-Lernen und zur Selbsterkundung —
FastAPI + SQLite + Vanilla-JS-PWA, komplett lokal, kostenlos, ohne Cloud.
**Die Vision (Philipps Worte):** *Keine App, sondern eine persönliche
Traumlandschaft, die sich mit jedem Eintrag ausbreitet — man beobachtet sich
selbst in absurden Momenten und lernt sich genau dort kennen. Füttern, wann es
passt; ernten, wenn Lust da ist.* (Voll ausformuliert: „Der Traumfaden“,
Plan HILFE H.4.)

## Aktueller Stand (Juli 2026)

Umgesetzt und committet: Tagebuch mit Offline-Outbox und Passwortschutz ·
Emotionen (12), ⭐ Große Träume, Beifuß · Traumkompass (LaBerge) mit Mission ·
Atlas mit drei Ansichten (Netz + Filter/Fokus/Zeitraffer, Traumweltkarte mit
Nebel, Innenwelt mit Archetypen) · Traum-Mandala · Abendritual mit Inkubation
+ Morgen-Rückfrage · Bucket-List · Rotlicht-Modus · Reflexionen,
Symbol-Lexikon, Aktive Imagination, Jung-Analyse pro Traum, Synchronizitäten ·
Jung-Kompendium + 💡-Wissens-Momente · Traum-Echos · Export/Import ·
Desktop-Paket (PyInstaller, `~/Klartraum` bzw. `~/Traumader`) ·
Umbenennung auf **Traumader** inkl. Ader-Logo.

## Verbindliche Arbeitsreihenfolge

1. **`UMSETZUNGSPLAN-SICHERHEITSNETZ.md`** — Backups, Testsuite, Modul-Schnitt,
   Robustheit. **Vor allem anderen.** (Ohne Netz kein weiterer Umbau.)
2. **`UMSETZUNGSPLAN-HILFE.md`** — offene Stufen prüfen/abschließen
   (ⓘ-Hilfe, Archetypen-Lexikon, Traumfaden + Sternenknopf).
3. **`UMSETZUNGSPLAN-TRAUMADER.md`** — Rest: T.2 (allgemeine Reise raus),
   T.3-Rest (SW-Cache für neue Icons).
4. **`UMSETZUNGSPLAN-ANALYSE-UX.md`** — Stand abgleichen, Offenes abarbeiten.
5. **`UMSETZUNGSPLAN-I18N.md`** — Zweisprachigkeit (bewusst nach den
   Text-lastigen Plänen, damit Texte nur einmal umziehen).
6. Danach: aus **`BACKLOG.md`** kuratieren (Ideentank; Philipp entscheidet).
   Nach ~4 Wochen echter Nutzung: Vier-Wochen-Review (Unbenutztes einklappen
   oder entfernen).

### Analyse-Ausbau (ergänzt 19.07.2026, Reihenfolge verbindlich)

Sechs verzahnte Pläne; Details und Querverweise stehen in den Plänen selbst.
Sind 1.–5. der alten Liste erledigt, gilt:

1. **E.2** (`UMSETZUNGSPLAN-ERKENNTNISSE.md`) — n-Badges; Fundament für
   alles Statistische. Klein, zuerst.
2. **TD.1 + TD.2** (`UMSETZUNGSPLAN-TRACKERDATEN.md`) — Tracker-Import;
   echtes Format ist im Plan entschlüsselt, Export liegt vor. Je früher,
   desto mehr Nächte sammeln sich in der App.
3. **SS.1** (`UMSETZUNGSPLAN-SCHLAFSCHULE.md`) — Analyse-Sektion „😴 Schlaf"
   als Zuhause der Schlaf-Karten; SS.3 (Schlafschule-Texte) jederzeit
   parallel möglich.
4. **V-Fundament + V.1** (`UMSETZUNGSPLAN-VERBINDUNGEN.md`) — Verbindungs-
   Analyse, danach V.2–V.4 nach Lust.
5. **E.3 + E.4** — neue Datenerhebung (Erinnerungs-Block, Nacht-/Tages-
   Kontext); früh, damit Daten wachsen. Dann **E.7**.
6. **D.1–D.4** (`UMSETZUNGSPLAN-DASHBOARD.md`) — Analyse-UX + Erkenntnis-
   Engine (braucht E.2; Generatoren wachsen mit E-/V-/TD-Stufen).
7. **M.1–M.4** (`UMSETZUNGSPLAN-MASKE.md`) — Eingabemaske (eigener Branch
   `maske-ux`, Rückweg-Garantien im Plan).
8. **TD.3 + SS.2 + SS.4** — Tracker-Analysen und Nacht-Detail, sobald
   ~2 Wochen Tracker-Nächte importiert sind. **E.5** (Valenz) und
   **V.5**/**E.6** flexibel dazwischen.

Merkregeln für alle neuen Pläne: Luzidität tritt bei Philipp aktuell nicht
auf → überall Schlafend-Regel (Klartraum-UI erst ab erstem Traum mit
Luzidität ≥ 3). Keine neuen Pflichtfelder. Additiv vor ersetzend.
Der Nachtkino-Prototyp (`frontend/nachtkino.html`, git-ignoriert;
Generator `prototyp-nachtkino-generator.py`) ist Design-Vorlage für SS.2.

Separates Projekt: `~/Desktop/Klartraum App` (Multi-User-Version,
`UMSETZUNGSPLAN-MULTIUSER.md`) — unabhängig, eigene Zeitlinie.

## Dokumenten-Landkarte

| Datei | Zweck |
|---|---|
| `UMSETZUNGSPLAN.md` **Teil A** | Konventionen & Fallstricke — Pflichtlektüre vor jedem Coden |
| `UMSETZUNGSPLAN-*.md` | Spezifikationen (Format: Stufen mit Akzeptanzkriterien) |
| `ROADMAP.md` | Vision & Horizonte |
| `BACKLOG.md` | Lebender Ideentank — neue Ideen zuerst hierhin; enthält auch das Verworfene |
| `docs/ARCHITEKTUR.md` | System, Datenmodell, API — bei Änderungen mitpflegen! |
| `docs/HANDBUCH.md` | Nutzerhandbuch (deutsch) |
| `docs/VERTEILUNG.md` | Wie die App zu Freunden kommt (2-Stufen-Strategie) |
| `ANLEITUNG-FUER-FREUNDE.md` | Installations-Anleitung für Laien |
| `PROJEKT-KOMPASS.md` | dieses Dokument |

## Entscheidungs-Chronik (nicht neu verhandeln ohne neuen Grund)

- **Name:** Traumader (Juli 2026; Kandidaten-Reise: Nexus/Miller → organisch).
  Einstieg heißt „Der Traumfaden“, Icon: Entwurf A „die Ader“ (verzweigt,
  goldene Endpunkte = Träume).
- **Privat zuerst, kostenlos im Kern:** alles lokal; KI nur optional und
  später (dann bevorzugt lokal/Ollama); kein Tracking, keine Cloud-Pflicht.
- **Jung & Co. als Reflexionsrahmen, nie als Wahrheit:** Die App **fragt,
  sie deutet nicht**. Ehrliche Einordnung gehört zur DNA (Kompendium Kap. 9).
  Wissenschaftliche Basis: LaBerge (Traumzeichen, MILD, WBTB), Tholey
  (mentale Karten, Figuren-Dialog), Jung (Archetypen, Amplifikation,
  Kompensation, Aktive Imagination — Haltung siehe Plan JUNG).
- **Verteilung:** Software teilen statt Dienst hosten (keine fremden
  Traumdaten bei Philipp). Desktop-Paket via GitHub Releases; Endausbau
  Local-First-PWA. **Verworfen:** Tauri/Electron, Google-Drive-Backup.
- **Features verworfen:** Fragmente-Inbox/Share-Target; statische
  Intro-Startseite; allgemeine Individuationsreise (Traumebenen-Variante
  „Jung-Analyse“ bleibt!). Zurückgestellt: Traumskizzen, Wearables.
  Details: `BACKLOG.md` unten.
- **Datenordner:** `~/Klartraum/` bleibt für Bestandsdaten gültig
  (Kompatibilität!), Neuinstallationen `~/Traumader/`.

## Wie Philipp arbeitet (wichtig für jedes Modell)

- **Sprache:** Deutsch, per Du. Kurze, ehrliche Erklärungen — er ist Data
  Scientist und lernt Software Engineering: Konzepte gern in einem Satz
  erklären, nicht dozieren.
- **Workflow:** Claude/Planungs-Modell schreibt Spezifikationen, ein
  Coding-Modell setzt um — Stufe für Stufe, ein Commit pro Stufe, deutsche
  Commit-Messages, Akzeptanzkriterien abhaken.
- Er **testet selbst täglich** und gibt präzises Nutzungs-Feedback — das ist
  die wichtigste Quelle für Prioritäten. Feedback ernst nehmen, in Pläne
  gießen, Anlass im Plan-Kopf dokumentieren.
- **Seine Daten sind heilig:** echte `dreams.db` nie für Tests verwenden;
  Testdaten erkennbar benennen und restlos löschen; vor riskanten Schritten
  Sicherungskopie.
- Bei Namens-/Designfragen: Optionen mit Begründung anbieten, Empfehlung
  aussprechen, ihn entscheiden lassen. Entschiedenes festhalten.

## Die heiligen Regeln (Kurzfassung von Teil A + Neuzugänge)

1. Frontend-Änderung → `sw.js` SHELL pflegen und Version bumpen
   (entfällt nach SICHERHEITSNETZ S.4 — dann automatisch).
2. Neue Spalten → `_migrate()` (PRAGMA-Muster); neue Tabellen → `models.py`.
3. Listenfelder an `DreamIn` → in `model_dump(exclude=…)` UND `apply_tags`
   (der historische 500er!).
4. Statische Routen vor Parameter-Routen registrieren (`/dreams/echoes`!).
5. `api.js` für alle Requests; `isNetworkError`/`isAuthError` respektieren
   (Offline-Outbox!).
6. Verifikation: Desktop + 412 px + Rotlicht-Modus, beide Sprachen (nach I18N).
7. Optimierungen für „viele Daten“ immer auch mit **wenig** Daten testen
   (die Atlas-Regression!).
8. Nach SICHERHEITSNETZ: jede Stufe endet mit grüner pytest-Suite.
9. Nach I18N: alle UI-Texte zweisprachig über `t()`.
10. Doku mitpflegen: ARCHITEKTUR bei Struktur-, HANDBUCH bei
    Nutzer-sichtbaren Änderungen.

## Offene Fäden (Stand Juli 2026)

- Sicherheitsnetz komplett offen (höchste Priorität).
- HTTPS im Heimnetz (Tailscale) → volle PWA am Pixel — Anleitung da, nie umgesetzt.
- Erster GitHub-Release + erste Freunde: wartet auf Sicherheitsnetz + Politur.
- „Das Lesezimmer“ (BACKLOG, herausgehoben) ist Philipps nächster Herzenswunsch
  nach dem Fundament.
