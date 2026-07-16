# 🧭 Umsetzungsplan „Dashboard": Analyse-UX — Überblick, Erkenntnisse, kompakte Ansicht

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Konventionen — Tests Pflicht,
> alle UI-Texte zweisprachig über `t()`, Service-Worker-`SHELL`-Liste bei
> neuen Dateien, Verifikation im Browser inkl. Rotlicht + 412 px).
>
> **Anlass (Philipp, Juli 2026):** Das Durchscrollen der Chart-Karten ist
> mühsam; der Nutzer muss selbst nach Mustern suchen. Ziel: **Die App
> analysiert, nicht der Nutzer** — Erkenntnisse zuerst, Charts als Beleg.
>
> **Verbindliche Sicherheits-Prinzipien (nichts verlieren!):**
> 1. **Additiv vor ersetzend.** Neue Ansichten kommen DAZU (eigener Chip),
>    bestehende Sektionen bleiben unangetastet, bis der Praxistest (D.5)
>    entschieden ist.
> 2. **Alles Umschaltbare hinter Toggles** mit Standard-Rückweg — kein
>    Zustand, aus dem man nicht mit einem Tap zur alten Ansicht kommt.
> 3. **Read-only-Backend.** Dieser Plan ändert kein Datenbank-Schema und
>    keinen bestehenden Endpoint; es kommt höchstens ein neuer, rein
>    lesender Endpoint dazu.
> 4. **Branch-Disziplin:** Entwicklung auf `dashboard-ux`, ein Commit pro
>    Stufe, `main` bleibt der stabile Alltags-Stand. `dreams.db` ist
>    git-ignoriert und von Branch-Wechseln unberührt.
> 5. **Schlafend-Regel** (wie E.6): Luziditäts-Kacheln/-Findings erst ab
>    dem ersten Traum mit Luzidität ≥ 3.
>
> **Querverbindungen:** `UMSETZUNGSPLAN-ERKENNTNISSE.md` — D.3 braucht die
> n-Schwellen aus **E.2** (vorher umsetzen); die Erkenntnis-Engine wird mit
> jeder E-Stufe (E.3/E.4/E.7) und später TD.3 wertvoller, weil neue
> Analysen nur einen Generator registrieren.

---

## Überblick der Stufen

| Stufe | Inhalt | Risiko für Bestehendes |
|---|---|---|
| D.1 | Quick Wins: Sticky-Nav, Swipe, Zustands-Merken | keins (nur Verhalten) |
| D.2 | Überblicks-Sektion als neuer 7. Chip (Standard) | keins (additiv) |
| D.3 | Erkenntnis-Engine + neuer Endpoint `/api/stats/insights` | keins (read-only) |
| D.4 | Kompakte Ansicht: Accordion-Wrapper hinter Toggle | gering (Wrapper, abschaltbar) |
| D.5 | Zwei-Wochen-Praxistest mit Rückbau-Kriterien, dann Merge | — |

---

## Stufe D.1: Quick Wins — Navigation ohne Umbau

Rein `stats.js`/`style.css`/`index.html`, keine Backend-Änderung.

1. **Sticky Sektions-Chips:** `#stats-section-nav` bleibt beim Scrollen
   oben sichtbar (`position: sticky`, unter der Filterleiste; Filterleiste
   selbst klappt beim Scrollen auf eine Zeile mit der aktuellen Auswahl
   zusammen, Tap öffnet sie wieder).
2. **Swipe zwischen Sektionen** (Zielgerät Pixel, 412 px): horizontale
   Touch-Geste auf `#stats-sections` wechselt zur Nachbar-Sektion
   (einfache touchstart/touchend-Delta-Logik, Schwelle ~60 px; kein
   Bibliotheks-Import). Chips bleiben synchron.
3. **Zustand merken:** zuletzt aktive Sektion, Zeitraum/Granularität/
   Aufriss in `localStorage` (`stats-ui-state`) — beim nächsten Öffnen
   genau dort weitermachen.

**Tests:** Backend keine; im Browser durchspielen (Swipe, Sticky, Reload
mit gemerktem Zustand, Rotlicht-Modus).

**Akzeptanz:** Kein bestehendes Chart verhält sich anders; nur Navigation
und Gedächtnis sind neu.

## Stufe D.2: Überblick — die neue Startansicht (additiv)

Neuer **siebter Chip „🏠 Überblick"** in `#stats-section-nav`, als
Standard aktiv (bzw. gemerkter Zustand aus D.1 gewinnt). Die sechs
bestehenden Sektionen bleiben byte-identisch. Datenquelle: das ohnehin
geladene `/api/stats`-Ergebnis — **kein neuer Request**.

**Inhalt (in dieser Reihenfolge):**
1. **Kennzahl-Kacheln** (Grid 2×2): Streak · Träume/Woche · Ø Wörter ·
   Klartraum-Quote (letzte Kachel nach Schlafend-Regel, sonst durch
   „Erinnerungs-Score" ersetzt). Jede Kachel: Wert + Trend-Pfeil
   (Vergleich letzter vs. vorletzter Bucket) + **Mini-Sparkline als
   inline-SVG** (bewusst kein Chart.js — 4 zusätzliche Canvas-Instanzen
   wären Verschwendung).
2. **Erkenntnis-Karten** (ab D.3; bis dahin Platzhalter ausblenden,
   KEIN leerer Kasten).
3. **Gepinnte Karten:** Jede Chart-Karte in den Themen-Sektionen bekommt
   ein 📌-Icon; gepinnte Karten erscheinen zusätzlich im Überblick
   (Render-Funktion wiederverwenden, Ziel-Container als Parameter).
   Pin-Zustand in `localStorage` (`stats-pins`).
4. **Tap auf Kachel/Karte** springt in die zugehörige Sektion und scrollt
   zur Quell-Karte (kurzes Hervorhebungs-Blinken, CSS-Klasse ~1,5 s).

**Tests:** Die Kennzahlen selbst sind bereits backend-getestet. Die
Trend-Pfeil-Logik (steigend/fallend/stabil, leere Buckets) ist reines
Frontend und das Projekt hat kein JS-Test-Setup — daher: als kleine
pure Funktion herauslösen und im Browser gegen einen bekannten
Zeitraum verifizieren (drei Fälle gezielt herstellen).

**Akzeptanz:** Chip entfernen = alles wie vorher (der komplette Rückweg
dieser Stufe ist ein einzelner Revert-Commit).

## Stufe D.3: Erkenntnis-Engine — die App formuliert Befunde

**Backend:** Neues Modul `backend/insights.py` + Endpoint
`GET /api/stats/insights?from=&to=` (geschützter Router, read-only).

**Generator-Registry:** Jeder Generator ist eine kleine Funktion
`(dreams, nights, …) → Finding | None` und in einer Liste registriert.
Ein Finding:

```json
{
  "id": "sleep_words",              
  "section": "experiments",        
  "anchor": "sleep-analysis-heading",
  "text_key": "insights.sleepWords",
  "params": {"pct": 38, "n": 21},
  "effect": 0.38,
  "n": 21
}
```

- **Zweisprachigkeit (Pflicht):** Die Engine liefert NIE fertige Sätze,
  sondern `text_key` + `params`; `t()` baut den Satz im Frontend
  (DE: „Nach Nächten über deinem Schlaf-Median erinnerst du dich an
  38 % mehr Wörter"). Jeder Generator bringt sein DE/EN-Paar in
  `i18n.js` mit.
- **n-Wächter:** Kein Finding unter n = 5 pro Vergleichsgruppe (Schwellen
  konsistent mit E.2); zusätzlich je Generator eine Effekt-Mindestschwelle
  (z. B. ≥ 20 % relativer Unterschied), damit Rauschen nie zum „Befund" wird.
- **Ranking:** Server sortiert nach Effektstärke; der Client rotiert
  (zuletzt gezeigte Finding-IDs in `localStorage`, `stats-insights-seen`,
  rücken ans Ende). Angezeigt werden maximal 3.

**Start-Generatoren (funktionieren ohne die E-Datenerhebung):**
1. `writing_trend` — Ø Wörter letzter 4 Buckets vs. 4 davor.
2. `streak` — Streak ≥ 7 Tage (Feier-Finding, Effekt = Streak-Länge).
3. `new_element` — Neuheit mit ≥ 3 Vorkommen in 14 Tagen.
4. `emotion_shift` — stärkste Emotions-Verschiebung aktueller Zeitraum
   vs. Gesamtbild.
5. `sleep_words` — Wörter über/unter Schlaf-Median (nutzt vorhandene
   `build_sleep_analysis`-Referenz).
6. `weekday` — auffälligster Wochentag (nur bei deutlichem Ausreißer).
7. *(Schlafend-Regel)* `lucid_rate_change`, `beifuss` — erst ab dem
   ersten Klartraum bzw. ausreichenden Gruppen.

Spätere E-/TD-Stufen registrieren hier je einen Generator (Recall-Qualität,
Tagesanklänge, Figuren-Valenz, REM …) — das ist der Skalierungspfad.

**Frontend:** Erkenntnis-Karten im Überblick (D.2, Position 2): Satz +
n-Angabe + „Zum Beleg-Chart →" (Sprung über `section` + `anchor` mit
Hervorhebung wie D.2.4).

**Tests (Pflicht, Kern dieser Stufe):** Pro Generator Fixtures mit
handgerechnetem Ergebnis — Positivfall (Finding mit exaktem `params`-Satz),
Negativfall n zu klein (KEIN Finding), Negativfall Effekt zu klein,
Grenzwerte. Endpoint: Ranking-Reihenfolge, Zeitraum-Filter, 401.

**Akzeptanz:** Bei Philipps echtem Datenbestand erscheinen nur Findings,
die einer Handprüfung am Beleg-Chart standhalten; unter den Schwellen
bleibt der Bereich komplett leer statt „0 Erkenntnisse".

## Stufe D.4: Kompakte Ansicht — Accordion hinter Toggle

Der einzige Eingriff in Bestehendes — deshalb als **Wrapper, nicht Umbau**:

- Die bestehenden Chart-Karten bleiben unverändert; sie werden pro
  Sektion in auf-/zuklappbare Container gelegt. **Render-Logik in
  `stats.js` wird nicht angefasst**, nur der Aufruf-Zeitpunkt:
  Chart erst beim ersten Aufklappen rendern (Lazy Rendering — spart
  bei ~25 Chart.js-Instanzen spürbar Zeit und Akku).
- **Pro Sektion ein Hero:** die erste/wichtigste Karte bleibt immer
  aufgeklappt (write: Wörter über Zeit · lucidity: Klarträume pro
  Zeitraum · emotions: Emotionale Landschaft · experiments:
  Schlaf & Erinnerung · compass: Traumkompass · review: Innere Figuren).
- **Eingeklappter Zustand trägt die Kernzahl:** Titelzeile +
  eine Zahl/Aussage („Wortzahl-Verteilung · Median 120 ▾") — die
  Kernzahl liefert die jeweilige Render-Funktion als kleines
  `summary()`-Pendant (wo keine sinnvolle Zahl existiert: nur Titel).
- **Frage-Überschriften + Takeaway-Zeile:** Kartentitel werden als Fragen
  formuliert („Wann erinnerst du dich am besten?" statt
  „Erinnerungs-Score"); unter dem Titel eine Takeaway-Zeile aus der
  Finding-Logik von D.3 (derselbe Generator, an die Karte gebunden;
  ohne sicheres Finding: keine Zeile). Alle Texte über `t()`.
- **Toggle „Kompakte Ansicht"** neben den Sektions-Chips: Standard AN,
  Zustand in `localStorage`. AUS = exakt die heutige Chart-Wand
  (Wrapper alle aufgeklappt, sofortiges Rendern) — der Ein-Tap-Rückweg.
- Aufklapp-Zustände pro Karte merken (D.1-State erweitern).

**Tests:** `summary()`-Werte backend-seitig, wo sie aus `/api/stats`
ableitbar sind; sonst Browser-Verifikation: Toggle beide Richtungen,
Lazy Rendering (Chart erscheint beim Aufklappen), Rotlicht, 412 px,
Split-Ansicht (Aufriss) in auf- und zugeklappten Karten.

**Akzeptanz:** Toggle AUS reproduziert die heutige Ansicht vollständig;
kein Chart rendert doppelt; Aufklappen fühlt sich sofort an (< 100 ms
wahrgenommen, Rendern beim Öffnen ist ok).

## Stufe D.5: Praxistest & Entscheidung — erst bewähren, dann aufräumen

**Zwei Wochen echte Nutzung** auf dem `dashboard-ux`-Branch (App lokal —
`git checkout main` ist jederzeit der Not-Ausgang). Danach drei Fragen
ehrlich beantworten:

1. Öffnest du den Analyse-Tab **öfter** als vorher? (Gefühl reicht;
   optional Strichliste)
2. Welche Karten hast du **nie aufgeklappt**? → Kandidaten fürs
   Entfernen oder für den Umzug ans Sektions-Ende.
3. Stimmen die Erkenntnis-Sätze? Jedes gezeigte Finding einmal am
   Beleg-Chart nachprüfen — jede Abweichung ist ein Bug (Test nachrüsten).

**Rückbau-Kriterien (vorab festgelegt, damit die Entscheidung leichtfällt):**
- Überblick wird nicht genutzt → Chip entfernen (ein Revert), Engine
  bleibt als Takeaway-Zeilen-Lieferant erhalten.
- Kompakte Ansicht nervt → Toggle-Standard auf AUS drehen (eine Zeile),
  Lazy Rendering trotzdem behalten (unsichtbarer Gewinn).
- Beides bewährt sich → Merge in `main`; erst DANACH aufräumen:
  ungenutzte Karten entfernen, ggf. Sektionen zusammenlegen —
  als separater, eigener Commit mit eigener Browser-Verifikation.

**Abschluss:** `docs/ARCHITEKTUR.md` (neuer Endpoint, insights.py) und
`docs/HANDBUCH.md` (Überblick, Toggle, Pins) nachziehen;
`PROJEKT-KOMPASS.md`-Stand ergänzen. BACKLOG: Ideen, die im Praxistest
entstehen, zuerst dorthin.

---

## Reihenfolge & Einordnung

```
D.1 Quick Wins → D.2 Überblick → D.3 Engine → D.4 Kompakt → [2 Wochen] → D.5
```

- **Voraussetzung für D.3:** E.2 (n-Schwellen) aus
  `UMSETZUNGSPLAN-ERKENNTNISSE.md`. D.1/D.2 können davor liegen.
- **Empfohlene Verzahnung:** E.1–E.2 → D.1–D.4 → Praxistest läuft,
  währenddessen E.3/E.4 (Datenerhebung sammelt schon) → neue Generatoren
  registrieren, sobald deren Daten tragen.
- Jede Stufe: pytest grün, DE + EN, 412 px + Rotlicht, ein Commit,
  Testdaten nur als `TEST-…` und restlos gelöscht.
