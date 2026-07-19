# 🛌 Umsetzungsplan „Schlafschule": Schlaf verstehen — eigener Reiter + Wissen

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Konventionen — Tests
> Pflicht, alle UI-Texte zweisprachig über `t()`, Browser-Verifikation
> inkl. Rotlicht + 412 px).
>
> **Anlass (Philipp, Juli 2026):** Der Xiaomi-Tracker (Smart Band 10)
> ist da. Gewünscht: (a) ein eigener Bereich für die **reine
> Schlafanalyse** — Schlaf als eigenes Thema, nicht nur als Einflussgröße
> auf Träume — und (b) **Wissen im Lernen-Tab**: Was ist Schlaf, was
> messen Tracker, wie liest man die eigenen Daten?
>
> **Didaktisches Leitprinzip (verbindlich): personalisiertes Wissen.**
> 1. **Deine Zahl statt Lehrbuch-Soll.** Jede Kennzahl wird am eigenen
>    Bestand verankert („Dein Median: 7 h 12 min") — Lehrbuchwerte nur
>    als Einordnung, nie als Ziel. (Ehrlichkeits-Grundsatz aus
>    `UMSETZUNGSPLAN-TRACKERDATEN.md`: Phasen sind Schätzungen,
>    Trends > Absolutwerte.)
> 2. **Jede Karte erklärt sich selbst:** ⓘ-Hilfe direkt an der Karte,
>    vertiefendes Kapitel in der Schlafschule per Deep-Link — Wissen
>    dort, wo die Frage entsteht.
> 3. **Keine Gesundheits-Versprechen.** Formulierungen wie „besserer
>    Schlaf heilt/verhindert …" sind tabu (MDR-Falle, s.
>    `SKALIERUNGSPLAN.md`); es geht um Beobachten und Verstehen.
>
> **Voraussetzungen & Verzahnung:**
> - SS.1 und SS.3 brauchen **keinen Tracker** (manuelle Nächte reichen;
>   SS.3 ist reiner Inhalt) — können sofort starten.
> - SS.2 braucht TD.1 + TD.2 (Phasen-Daten importiert).
> - Die Karten aus E.7 (`UMSETZUNGSPLAN-ERKENNTNISSE.md`) und TD.3
>   ziehen in die neue Schlaf-Sektion aus SS.1 um bzw. docken dort an.
> - E.2 (`nBadge`) gilt auch hier.

---

## Überblick der Stufen

| Stufe | Inhalt | Voraussetzung |
|---|---|---|
| SS.1 | Analyse-Sektion „😴 Schlaf" — Schlaf als eigenes Thema | keine (manuelle Nächte) |
| SS.2 | Nacht-Detail: Phasen-Balken & „Was heißt das?" | TD.1 + TD.2 |
| SS.3 | Schlafschule im Lernen-Tab (5 Kapitel, zweisprachig) | keine |
| SS.4 | Verzahnung: Deep-Links, 💡-Momente, Erst-Import-Begrüßung | SS.1–SS.3 |

---

## Stufe SS.1: Analyse-Sektion „😴 Schlaf" — Schlaf als eigenes Thema

Neuer Sektions-Chip **„😴 Schlaf"** in `#stats-section-nav`. Die
bestehende Karte „😴 Schlaf & Erinnerung" **zieht aus 🔬 Experimente
hierher um** (Umzug, keine Kopie; Anker `sleep-analysis-heading` bleibt
erhalten — D.3-Insights und ⓘ-Verweise zeigen weiter darauf).

Aufbau von simpel zu tief (Verstehens-Treppe wie im Verbindungen-Plan):

1. **Kopfzeile — deine Nacht in Zahlen:** Kacheln Ø Schlafdauer
   (letzte 14 Nächte) · dein Median (Gesamtbestand, stabile Referenz) ·
   Regelmäßigkeit (Metrik aus E.7c, als Wort: regelmäßig/mittel/
   unregelmäßig) · erfasste Nächte gesamt. Mit Trend-Pfeilen wie im
   Dashboard-Plan D.2.
2. **„Deine Nächte" — der Verlauf:** Horizontale Nacht-Balken der
   letzten ~30 Nächte (ein Balken pro Nacht: von Zubettgeh- bis
   Aufwachzeit auf einer 18-Uhr-bis-12-Uhr-Achse; Inline-SVG, kein
   Chart.js). Grob-Nächte (`confidence=rough`) schraffiert,
   `unknown` als Lücke mit Punkt — Ehrlichkeit sichtbar machen.
   Tap auf einen Balken → Nacht-Detail (SS.2; vor TD.2: kleines Sheet
   mit den manuellen Werten).
3. **Rhythmus:** Ø Zubettgehzeit und Aufwachzeit je Wochentag (zwei
   kompakte Punkt-Reihen) — macht Wochenend-Verschiebung („sozialer
   Jetlag") ohne Fachbegriff sichtbar; die Bildunterschrift benennt
   sie im Satz („Am Wochenende gehst du im Schnitt 1 h 20 später ins
   Bett").
4. **Wirkung auf deine Träume:** Hierher ziehen/andocken: die
   Terzil-Karte (bestehend), E.7a/b/c-Karten, später alle TD.3-Karten.
   Am Ende Querverweis-Zeile in die 🔬 Experimente-Sektion (Beifuß
   bleibt dort — es ist ein Experiment, kein Schlaf-Grundthema).
5. Nach TD.2 zusätzlich in der Kopfzeile: Ø REM-Anteil und
   Wachphasen/Nacht (Kacheln erscheinen erst, wenn Tracker-Nächte
   existieren — kein „–"-Lärm vorher).

**Backend:** `/api/stats` um einen `sleep_overview`-Block erweitern
(Kacheln-Werte, Nacht-Balken-Daten, Wochentags-Rhythmus) — Berechnung
in `stats_helpers.py`, rein lesend.

**Tests (Pflicht):** Kachel-Werte und Wochentags-Mittel gegen
handgerechnete Fixtures (inkl. Mitternachts-Übergang und
Zeit-Mittelwert über Mitternacht — zirkulär rechnen wie E.7c!),
rough/unknown-Behandlung, leerer Bestand, 401.

**Akzeptanz:** Sektion ist mit rein manuellen Nächten voll nutzbar;
Experimente-Sektion zeigt keine Schlaf-Grundkarten mehr (kein Duplikat).

## Stufe SS.2: Nacht-Detail — eine Nacht wirklich lesen  *(nach TD.2)*

Tap auf eine Nacht (SS.1-Balken oder Formular-Schlafblock) öffnet ein
Bottom-Sheet:

1. **Phasen-Zeitleiste** („Hypnogramm light", aktualisiert 19.07.2026 —
   der echte Export liefert eine **minutengenaue Segment-Zeitleiste** in
   `Night.stages_json`, s. TD.1): echtes Treppen-Hypnogramm mit
   Tap-Erklärung pro Segment, optional zuschaltbarer Puls-Kurve und
   Traumfenster-Hervorhebung — **Design-Vorlage ist der
   Nachtkino-Prototyp** (`frontend/nachtkino.html`, git-ignoriert;
   Generator `prototyp-nachtkino-generator.py`). Daraus übernehmen:
   Segment-Tooltips, ✨-REM-Modus, ❤️-Puls-Overlay; die geführte Tour
   bleibt dem Prototyp/der Schlafschule vorbehalten (im Sheet zu viel).
   Zusätzlich: **REM-Fenster-Liste mit Uhrzeiten** (größtes markiert)
   und **Wachmomente mit Uhrzeit + REM danach** (die WBTB-Brücke).
   Fallback ohne `stages_json` (z. B. generic_csv-Import): gestapelter
   Summen-Balken der vier Phasen. Farben über CSS-Variablen,
   Rotlicht-tauglich; Legende mit Klartext („REM — hier träumst du").
2. **Einordnung als Sätze:** je Phase „x min — dein Median: y min"
   (Median nur aus Tracker-Nächten). Auffälligstes weicht ab →
   ein Satz oben („Diese Nacht hatte ungewöhnlich viel REM").
3. **Traum-Brücke:** Träume dieses Datums verlinkt (Titel, Tap →
   Lese-Ansicht aus Plan MASKE M.4 bzw. heutiges Verhalten).
4. **ⓘ „Was heißt das?"** → Deep-Link ins Schlafschule-Kapitel 3.
5. `source`/`confidence` sichtbar („⌚ Tracker-Messung (Schätzung)"
   vs. „✍️ von dir erfasst") — Kennzeichnungs-Regel aus TD.

**Backend:** `GET /api/nights/{date}` liefert nach TD.1 bereits alles
Nötige; ggf. um `medians`-Kontextblock erweitern (oder Frontend nutzt
`sleep_overview` — Implementierer entscheidet, DRY vor Dogma).

**Tests:** Median-Kontext, Nacht ohne Phasen (manuell) zeigt
Zeiten-Ansicht ohne leere Phasen-UI, 401; Browser: Sheet auf 412 px,
Rotlicht, Traum-Brücke.

## Stufe SS.3: Die Schlafschule — Wissen im Lernen-Tab

Neue Karte **„🛌 Schlafschule"** im Lernen-Tab, nach dem Muster des
Jung-Kompendiums (`learn.js`: `<details class="guide">`-Kapitel,
Konstante `SLEEP_GUIDES`, vollständig über `t()` — **das ist wie I.3
eine Fleißarbeit, Texte DE + EN von Anfang an**).

**Fünf Kapitel** (Reihenfolge = Lesepfad, jedes in Alltagssprache,
~1 Bildschirmseite, mit einer kleinen Inline-SVG-Skizze wo genannt):

1. **„Wie eine Nacht gebaut ist"** — Schlafzyklen (~90 min), die vier
   Phasen und ihre Aufgaben, warum der Morgenschlaf REM-reich ist
   (Skizze: idealisierte Zyklen-Treppe über eine Nacht). Kein Latein,
   keine Prozent-Normen.
2. **„Was dein Tracker wirklich misst"** — Bewegung + Puls als Basis,
   Phasen als Schätzung (Dauer gut, Phasen grob), warum man Trends
   statt einzelner Nächte liest, was der Herstellerscore ist und was
   nicht. Der Ehrlichkeits-Grundsatz als eigenes Kapitel — DAS
   Fundament, bevor jemand seine erste Import-Nacht überinterpretiert.
3. **„Deine Daten lesen"** — jede Kennzahl der App erklärt (Median,
   Terzile, Regelmäßigkeit, REM-Anteil, Wachphasen), je mit
   **personalisierter Zeile**: sobald Daten existieren, wird der eigene
   Wert eingeblendet („Dein Median: 7 h 12 min") — Wissenstext und
   eigene Zahl in einem Blick. Technisch: Kapitel-Renderer bekommt
   optional das `sleep_overview` aus SS.1.
4. **„Schlaf und Träume"** — REM-Traum-Verbindung, warum
   Weiterschlafen nach frühem Aufwachen traumreich ist (die sanfte
   WBTB-Erklärung, Querverweis WBTB-Rechner), warum Erinnerung direkt
   nach dem Aufwachen am größten ist (Brücke zur Notiz-Latenz E.3).
5. **„Gut zu wissen"** — Regelmäßigkeit als stärkster Hebel, Licht am
   Morgen, Koffein/Alkohol als Beobachtungs-Anregung (Bezug zum
   Substanz-Feld!), Nickerchen. Formuliert als „beobachte bei dir",
   nie als Gesundheits-Anweisung (Leitprinzip 3).

**Tests:** keine Backend-Änderung (Kapitel 3 nutzt vorhandene Daten);
Browser: DE/EN vollständig, Kapitel-Anker für Deep-Links funktionieren,
412 px, Rotlicht.

## Stufe SS.4: Verzahnung — Wissen dort, wo die Frage entsteht

1. **💡-Wissens-Momente** (`wissen.js`, Muster vorhanden): `sleep_phases`,
   `tracker_honesty`, `regularity` — an den passenden SS.1/SS.2-Karten,
   je mit „Mehr in der Schlafschule →"-Deep-Link (Kapitel-Anker).
2. **ⓘ-Hilfen** an jeder neuen Karte (bestehendes ⓘ-Muster aus Plan
   HILFE): zwei Sätze Karten-Erklärung + Deep-Link.
3. **Erst-Import-Begrüßung:** Nach dem ersten erfolgreichen
   Tracker-Import (TD.2-Ergebnisbericht) einmalige Karte „Deine ersten
   Tracker-Nächte sind da — so liest du sie" → führt in Schlafschule
   Kapitel 2 und die neue Schlaf-Sektion (Flag in localStorage).
4. **TD.3-Andockpunkt aktualisieren:** TD.3-Karten erscheinen in der
   Schlaf-Sektion aus SS.1 (der Hinweis „🔬 Experimente" im TD-Plan
   ist damit überholt — im TD-Plan vermerkt).

**Tests:** Browser-Verifikation der Deep-Links aus jeder Richtung;
Erst-Import-Karte erscheint genau einmal.

---

## Reihenfolge & Abschluss

```
SS.1 (sofort) → SS.3 (parallel möglich, reine Inhalte)
   → [TD.1/TD.2 mit echten Export-Dateien] → SS.2 → SS.4
```

- **Empfehlung:** SS.1 + SS.3 jetzt, während der Tracker ~2 Wochen
  Daten sammelt (TD-Vorgabe: TD.2 erst mit echten Export-Dateien!) —
  dann kommen SS.2/SS.4 genau dann, wenn die ersten Phasen-Daten da sind.
- Nach jeder Stufe: `docs/ARCHITEKTUR.md` (sleep_overview-Block) und
  `docs/HANDBUCH.md` (neue Sektion, Schlafschule) nachziehen; neue
  UI-Texte über `t()`; keine neuen JS-Dateien geplant — falls doch,
  `SHELL`-Liste in `sw.js` ergänzen; Testdaten nur als `TEST-…`.
- **Vier-Wochen-Review:** Kapitel, die nie geöffnet werden, bleiben
  (Wissen darf ruhen); Karten in SS.1, die nie genutzt werden, werden
  eingeklappt oder entfernt.
