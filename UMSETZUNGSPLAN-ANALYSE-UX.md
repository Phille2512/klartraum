# 📊 Umsetzungsplan „Analyse 2.0 + Atlas-Bedienbarkeit"

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Konventionen, Fallstricke),
> `docs/ARCHITEKTUR.md`. UI-Sprache: Deutsch.
>
> **Anlass — echtes Nutzerfeedback aus der Testphase (Juli 2026):**
> 1. Mehr Analysen zur Schreibmenge (Wortanzahl ist die Leitmetrik).
> 2. Zeitliche Ebenen wählbar: täglich, wöchentlich, monatlich, …
> 3. Aufriss nach Beifuß / ohne Beifuß über mehrere Analysen hinweg.
> 4. Bessere Emotions-Analysen.
> 5. Analyse-Tab thematisch gliedern (er ist unübersichtlich geworden).
> 6. Traumatlas wird mit wachsenden Daten unübersichtlich; Traumweltkarte
>    schwer zu bedienen; Innenwelt braucht bessere Erklärung im UI.

---

## Teil A — Analyse 2.0

### A.1 Globaler Zeitraum & Granularität  *(Fundament, zuerst)*

**Backend:** `GET /api/stats` erhält Parameter:
- `from`, `to` (ISO-Datum; Default: alles)
- `granularity` = `day` | `week` | `month` (Default `week`)
Alle Zeitreihen im Response („per_bucket“ statt bisher „per_week“) liefern
Buckets nach gewählter Granularität: `{bucket: "2026-07-08" | "2026-KW28" |
"2026-07", total, lucid, words, avg_words}`. Bestehende Blöcke (compass,
beifuss, focus_sign, …) respektieren from/to ebenfalls.

**Frontend (`stats.js`):** Ganz oben im Analyse-Tab eine **sticky Steuerzeile**:
- Zeitraum-Chips: `30 Tage · 90 Tage · Jahr · Alles` (+ von/bis-Felder hinter
  einem „…“-Chip)
- Granularität: `Tag · Woche · Monat`
- Auswahl in `localStorage`, alle Diagramme laden neu.
Bei Granularität `day` und Zeitraum > 90 Tage automatisch auf `week` anheben
(sonst Punktesuppe) — mit kurzem Hinweis.

**Akzeptanz:** Umschalten wirkt auf alle Zeitreihen; Buckets stimmen gegen
manuell gezählte Testdaten (Tag/Woche/Monat je einmal nachrechnen); 401 ohne Token.

### A.2 Thematische Gliederung des Analyse-Tabs

Unter der Steuerzeile eine **Unternavigation** (Chips, kein neuer Haupt-Tab):

| Sektion | Inhalt (bestehende + neue Karten) |
|---|---|
| ✍️ **Schreiben** | alles aus A.3 |
| ✨ **Luzidität** | Klarträume pro Bucket, Verteilung Traumerinnerung, Inkubations-Quote, Streak |
| 💛 **Gefühle** | alles aus A.5 |
| 🔬 **Experimente** | Beifuß-Vergleich, Korrelationen, Wochentags-Muster |
| 🧭 **Kompass** | Traumkompass, Mission, Traumzeichen-Chart |
| 🌗 **Rückblick** | Traum-Mandala, Jahresringe, Archetypen-Verteilung |

Gewählte Sektion in `localStorage`; nur die aktive Sektion rendert ihre Charts
(Performance). Kennzahl-Karten (Einträge, Klarträume, Quote, Streak) bleiben
immer sichtbar über der Unternavigation.

**Akzeptanz:** Kein Chart geht verloren (Inventur vorher/nachher); Wechsel
ohne Reload; mobil (412 px) scrollen die Chips horizontal.

### A.3 Schreib-Analysen — das Wortzahl-Paket

Neue/erweiterte Karten in Sektion ✍️ (Backend: `stats`-Response um
`writing`-Block erweitern):

1. **Kennzahlen:** Gesamtwörter („Dein Traumbuch: 12.480 Wörter“), Ø und
   Median Wörter/Eintrag, längster Traum (Titel verlinkt), Wörter in den
   letzten 7 Tagen vs. 7 davor (Trend-Pfeil ▲▼).
2. **Wörter pro Eintrag über Zeit** (Linie, Granularität aus A.1) + gleitender
   Durchschnitt über 5 Buckets als zweite, dickere Linie — der eigentliche
   Trainingsfortschritt.
3. **Kalender-Heatmap** (GitHub-Stil, letzte 6 Monate, reines SVG/CSS-Grid):
   ein Kästchen pro Tag, Farbintensität = Wortzahl, leere Tage sichtbar —
   motiviert Streaks mehr als die nackte Zahl. Tipp auf Kästchen → Datum +
   Wörter + Titel.
4. **Wortzahl-Histogramm:** Verteilung der Eintragslängen (Buckets 0, 1–25,
   26–50, 51–100, 101–200, 200+) — zeigt, ob Fragmente oder Epen dominieren.
5. **Detailtiefe:** Ø Anzahl getaggter Elemente (Zeichen+Orte+Personen) pro
   Traum über Zeit — zweite Qualitätsdimension neben Wörtern („erinnerst du
   mehr Substanz, nicht nur mehr Text?“).
6. **Erinnerungs-Score (transparent!):** eine Karte mit offengelegter Formel,
   z. B. `Score = 40 % Wortzahl-Perzentil + 30 % Detailtiefe-Perzentil +
   30 % Erinnerungsquote (lucidity ≥ 1)` je Bucket, als Linie. Formel als
   `<small>` direkt unter dem Titel — keine Blackbox.

**Akzeptanz:** Zahlen gegen Testdaten nachgerechnet; Heatmap-Tage stimmen mit
Kalender überein; alles reagiert auf A.1.

### A.4 Vergleichs-Aufriss (Beifuß & mehr)

In den Sektionen ✍️, ✨ und 💛 eine **Aufriss-Steuerung**:
`Aufreißen nach: – · 🌿 Beifuß · Wochenende/Werktag · ⭐ Große Träume`

- Backend: `GET /api/stats?split=beifuss|weekend|big_dream` → Zeitreihen und
  Verteilungs-Charts liefern zwei Serien (`series_a`, `series_b` mit Labels).
- Frontend: Charts zeigen beide Serien (zwei Farben, Legende), Kennzahlen als
  Paar („Ø 84 vs. 41 Wörter“). Gruppen mit n < 3 ausgrauen + Hinweis
  „zu wenig Daten“ (Ehrlichkeits-Konvention aus dem Korrelations-Dashboard).

**Akzeptanz:** Beifuß-Split zeigt konsistente Summen (a + b = gesamt);
Splits kombinieren sich korrekt mit Zeitraum/Granularität.

### A.5 Emotions-Paket

Sektion 💛, Backend liefert `emotions_analysis`-Block:

1. **Emotionen über Zeit:** gestapelte Fläche (top 6 Emotionen + „andere“)
   pro Bucket — sichtbar, wie sich die Gefühlslage verschiebt.
2. **Valenz-Bilanz:** Einteilung (Konstante, offengelegt per 💡):
   positiv = freude, liebe, frieden, staunen, neugier, sehnsucht;
   negativ = angst, trauer, wut, ekel, scham; neutral = verwirrung.
   Linie „Anteil positiver Gefühle“ über Zeit + Kennzahl aktueller Monat.
3. **Emotion × Luzidität:** Balken „Klartraum-Quote je Emotion“ (nur n ≥ 3) —
   welche Gefühle begleiten deine luziden Nächte?
4. **Gefühls-Paare:** Kookkurrenz-Matrix als Top-5-Liste („😨 Angst + 😵‍💫
   Verwirrung: 7×“) — einfacher als eine echte Matrix, mobil lesbar.
5. **Emotion × Ort/Person:** Top-Kombis („😊 Freude am 📍 Meer: 5×“) — Brücke
   in den Atlas (antippen öffnet die Traumserie).

**Akzeptanz:** Alle Karten reagieren auf Zeitraum + Aufriss (A.4, wo sinnvoll);
Valenz-Zuordnung per 💡 einsehbar; Zahlen stichprobengeprüft.

---

## Teil B — Atlas, Traumwelt & Innenwelt bedienbar machen

### B.1 Traumatlas entrümpeln (Netz-Ansicht)

Problem: Mit wachsenden Daten wird der Graph zum Knäuel. Maßnahmen:

1. **Standard: Top 20.** Nur die 20 häufigsten Elemente rendern; darunter
   Chip „+ 34 weitere anzeigen“ (schaltet stufenweise +20 frei).
2. **Filterleiste** über dem Graphen: Art-Toggles (📍/👤/🔮 einzeln
   abschaltbar), Mindest-Häufigkeit (Chips: `alle · ≥2× · ≥3× · ≥5×`),
   Zeitraum (`Alles · 90 Tage · 30 Tage` — Backend `GET /api/atlas?from=&to=`
   + `min_count=`). Einstellungen in `localStorage`.
3. **Fokus-Modus:** Knoten antippen zeigt wie bisher die Serie — NEU dazu ein
   Button „🎯 Fokussieren“: Graph rendert nur diesen Knoten + direkte
   Nachbarn (1 Hop), Überschrift „Fokus: elternhaus — ‹ zurück zum Überblick“.
   Das ist die wichtigste Einzelmaßnahme gegen das Knäuel.
4. **Label-Hygiene:** Beschriftung nur für Knoten mit count ≥ 2 oder > 15 px
   Radius; kleine Knoten zeigen den Namen erst bei Antippen (title/Serie).
5. **Suchfeld** „Element finden …“: Treffer wird gelb umrandet und der Graph
   ggf. in den Fokus-Modus geschaltet.
6. **Physik-Feinschliff:** Abstoßung skaliert mit Knotenzahl
   (`force = 1800 + 80·n`), damit 30+ Knoten nicht verklumpen; Iterationen
   bei > 40 Knoten auf 150 senken (Performance).

**Akzeptanz:** Mit 60 Test-Elementen (Skript-generiert, danach löschen) bleibt
die Ansicht lesbar; Fokus-Modus ein/aus; Filter kombinierbar; mobil bedienbar.

### B.2 Traumweltkarte: Bedienung

1. **Zoom & Pan:** Pinch/Scroll-Zoom (0,5×–3×) + Ziehen der Leinwand
   (viewBox-Transformation); Buttons `+ / − / ⌂` (Reset). Auf 412 px ist das
   die Grundvoraussetzung für alles Weitere.
2. **Modus-Klarheit:** Statt stiller Werkzeug-Toggles eine deutliche Leiste:
   `✋ Bewegen · 📍 Platzieren · 🚶 Weg · 🗑️ Entfernen` — aktiver Modus farbig,
   und ein **einzeiliger Hinweistext darunter, was jetzt zu tun ist**
   („Weg-Modus: Tippe zwei Orte nacheinander an“). Der fehlende Hinweis ist
   die Hauptquelle der Verwirrung.
3. **Undo:** letzte Aktion rückgängig (einfacher Stack der letzten 10
   API-Aktionen mit inverser Operation) — nimmt die Angst vorm Ausprobieren.
4. **Platzieren vereinfacht:** Ablage-Chip antippen → Karte zeigt
   halbtransparenten „Geist-Knoten“ am Finger/Cursor → Tipp platziert.
   Abbrechen per Zurück-Chip.
5. **Regionen (kleines, wirksames Feature):** Orte per Mehrfachauswahl zu einer
   benannten **Region** gruppieren („Kindheitsland“) — gerenderte, weiche
   Farbfläche (konvexe Hülle) hinter den Knoten. Neue Tabelle
   `MapRegion(id, name, color)` + `tag.region_id` (Migration). Regionen machen
   große Karten überschaubar und sind mental-map-fördernd (Tholey).
6. **Ort suchen:** Suchfeld → Karte zoomt/zentriert auf den Ort, kurzer Puls.

**Akzeptanz:** Alle Aktionen mit Touch auf 412 px durchspielbar; Undo macht
Platzieren/Weg/Entfernen rückgängig; Regionen überleben Reload; Nebel,
bestehende Wege und Steckbriefe funktionieren unverändert.

### B.3 Innenwelt: verständlich machen

Kein Umbau der Mechanik — ein Verständnis-Problem. Maßnahmen:

1. **Intro-Karte beim ersten Öffnen** (danach hinter 💡), Text verbindlich:
   > **Was du hier siehst:** die Menschen aus deinen Träumen, angeordnet um
   > dein „Selbst“ in der Mitte. Jede Figur steht in dem Feld, das ihrer
   > **Rolle in deinem Innenleben** entspricht (nach C. G. Jung) — der
   > Schatten, der Weise, der Trickster …
   > **Was du hier tust:** ① Figur antippen → ihre Geschichte lesen.
   > ② Ihr eine Rolle geben, wenn sie noch außen steht. ③ Über
   > „Gespräch fortsetzen“ mit ihr in Dialog gehen (Aktive Imagination).
   > **Warum:** Wer seine inneren Figuren kennt, erkennt sie im Traum wieder —
   > und Wiedererkennen macht luzide.
2. **Beschriftungen konkreter:** Sektor-Beschriftungen um ein Wort ergänzt
   („🌑 Schatten — das Abgelehnte“, „🧙 Weise — der Rat“ …); äußerer Ring
   erhält Überschrift „Noch ohne Rolle — antippen zum Einsortieren“.
3. **Geführter Erstkontakt:** Ist keine einzige Figur einsortiert, zeigt die
   Bühne statt Leere die häufigste Person mit Pfeil: „Beginne mit ‚mama‘ —
   welche Rolle spielt sie in deinen Träumen?“ (öffnet direkt den Picker).
4. **Rückweg sichtbar:** Im Figuren-Dossier oben „‹ zurück zur Bühne“.
5. Begriff prüfen: Tab-/Ansichtsname „🌗 Innenwelt“ um Untertitel ergänzen:
   „Deine Traumfiguren und ihre Rollen“.

**Akzeptanz:** Ein unvorbereiteter Testnutzer (Philipp spielt Freund) kann in
60 Sekunden erklären, was die Ansicht zeigt; Erstkontakt-Flow führt zur ersten
Einsortierung; Intro erscheint genau einmal.

### B.4 Innenwelt: skalieren, wenn die Figuren mehr werden

Die Bühne funktioniert mit 8 Figuren — bei 40+ wird sie so unlesbar wie der
Atlas. Maßnahmen (gleiche Philosophie wie B.1: Standard zeigt wenig, alles
bleibt erreichbar):

1. **Hauptbesetzung zuerst:** Pro Archetyp-Sektor maximal **4 Figuren**
   (nach Vorkommen), der Rest wird pro Sektor zu einem kleinen Sammel-Chip
   „+3“ am Sektorrand — Antippen öffnet die Sektor-Ansicht (Punkt 2).
   Äußerer Ring (ohne Rolle): maximal 6, sortiert nach Vorkommen, Rest als
   „+ N weitere ohne Rolle“.
2. **Sektor-Ansicht:** Tipp auf Sektor-Beschriftung oder Sammel-Chip →
   die Bühne zeigt nur diesen Archetyp: alle seine Figuren großzügig
   angeordnet, mit „‹ zurück zur Bühne“. (Analog zum Fokus-Modus des Atlas —
   gleiche Interaktionssprache, ein Lernaufwand.)
3. **Aktiv vs. Archiv:** Standardmäßig nur Figuren, die in den **letzten
   12 Monaten** geträumt wurden; Umschalter „alle Zeiten“. Wer jahrelang
   Tagebuch führt, sieht sonst jede Zufallsbekanntschaft von vor drei Jahren.
   (Backend: `GET /api/innenwelt?from=&to=` — `last_date` wird ohnehin geliefert.)
4. **Mindest-Vorkommen:** Chips `alle · ≥2× · ≥3×` (localStorage) — einmalige
   Statisten-Figuren sind selten Archetyp-Material.
5. **Listen-Alternative:** Umschalter „🎭 Bühne | ☰ Liste“ — sortierbare
   Tabelle (Name, Rolle, Vorkommen, zuletzt geträumt, Gespräche ja/nein),
   Zeile antippen → Dossier. Für schnelles Arbeiten und als barrierefreier
   Zugang der bessere Weg; die Bühne bleibt der emotionale.
6. **Suche:** Feld „Figur finden …“ → direkt ins Dossier.
7. **Label-Hygiene wie im Atlas:** Namen nur an Figuren mit count ≥ 2 oder
   im Fokus; kleine Figuren zeigen den Namen beim Antippen.

**Akzeptanz:** Mit 50 Skript-generierten Personen (danach löschen!) bleibt die
Bühne lesbar und flüssig; Sektor-Ansicht rein/raus; Aktiv/Archiv- und
Mindest-Vorkommen-Filter kombinierbar; Liste sortiert korrekt; Erstkontakt-Flow
aus B.3 funktioniert weiterhin.

---

## Reihenfolge & Abschluss

```
A.1 Zeitraum/Granularität → A.2 Gliederung → A.3 Schreiben → A.4 Aufriss
   → A.5 Emotionen → B.1 Atlas → B.3 Innenwelt verstehen (klein!)
   → B.4 Innenwelt skalieren → B.2 Traumwelt (größte Stufe)
```
(B.3 vor B.2 ziehen — es ist ein Nachmittag und beseitigt echte Verwirrung.
B.4 direkt danach, solange die Innenwelt-Codebasis frisch im Kopf ist.)

Pro Stufe: Testdaten-Skript nutzen und restlos aufräumen, Desktop + 412 px +
Rotlicht prüfen, `sw.js`-Cache bumpen, ein Commit. Die pytest-Suite (falls
inzwischen vorhanden) um die neuen `stats`-Parameter erweitern.
