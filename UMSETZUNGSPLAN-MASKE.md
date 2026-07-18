# ✍️ Umsetzungsplan „Maske": Die Eingabemaske — Bühne für den Traum

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Konventionen — alle
> UI-Texte zweisprachig über `t()`, Verifikation im Browser inkl.
> Rotlicht + 412 px, Testeinträge nur als `TEST-…`).
>
> **Anlass (Philipp, Juli 2026):** Die Maske ist gedrängt, das Textfeld
> (fix 6 Zeilen) ist besonders im Browser zu klein zum Schreiben und
> Lesen, die Feld-Reihenfolge springt thematisch hin und her.
>
> **Verbindliche Garantien (beide hart):**
> 1. **Feld-Paritäts-Garantie:** JEDES heute erfasste Merkmal bleibt
>    erfassbar — kein Feld fällt weg, keins wird Pflicht, das an den
>    Server gesendete Payload bleibt **byte-identisch** zum heutigen
>    Stand. Dieser Plan ist reiner Frontend-Umbau: kein Backend-, kein
>    Schema-, kein API-Change. Checkliste am Planende ist Akzeptanz-
>    kriterium JEDER Stufe.
> 2. **Rückweg-Garantie:** Zwei Ebenen.
>    – **Sofort-Rückweg in der App:** Toggle „Klassische Maske"
>      (ab M.1, localStorage) stellt einspaltiges Layout, aufgeklappte
>      Gruppen und native Auswahlfelder wieder her. Ehrliche Grenze:
>      Die thematische Gruppen-*Reihenfolge* (ab M.2) bleibt auch im
>      klassischen Modus — die exakte alte Feldfolge kommt nur über Git.
>    – **100 %-Rückweg über Git:** Entwicklung auf Branch `maske-ux`,
>      **ein Commit pro Stufe**, jede Stufe einzeln revertierbar;
>      `main` bleibt der stabile Alltags-Stand (`dreams.db` ist
>      git-ignoriert und von Branch-Wechseln unberührt).
> 3. **Der Schnellpfad bleibt heilig:** Pflicht ist weiterhin nur der
>    Titel; Text + Titel + Datum + Speichern muss in unter 30 Sekunden
>    möglich sein, ohne eine Gruppe zu öffnen.
>
> **Querverbindungen:** Die Gruppen-Karten (M.2) definieren die
> Andock-Plätze für kommende Felder aus `UMSETZUNGSPLAN-ERKENNTNISSE.md`
> (E.3 Erinnerungs-Block → „Der Traum" · E.4a Aufwachart → „Die Nacht" ·
> E.5 Personen-Valenz → „Elemente" · E.6 Klartraum-Block → „Der Traum",
> schlafend). Die Chip-Eingabe (M.3) verbessert die Datenqualität der
> Elemente — Grundlage für `UMSETZUNGSPLAN-VERBINDUNGEN.md`.

---

## Überblick der Stufen

| Stufe | Inhalt | Rückweg |
|---|---|---|
| M.1 | Luft & Bühne: Abstände, Auto-Grow-Textfeld, 2 Spalten, Toggle | Toggle + Revert |
| M.2 | Vier Gruppen-Karten, zwei davon eingeklappt | Toggle (offen) + Revert |
| M.3 | Chips: Luzidität, Schlafqualität, Element-Eingabe | Toggle (nativ) + Revert |
| M.4 | Lese-Ansicht getrennt vom Bearbeiten + Entwurf-Sicherung | Einstellung + Revert |
| M.5 | Zwei-Wochen-Praxistest, Entscheidung, Merge | — |

---

## Stufe M.1: Luft & Bühne  *(CSS + minimaler Markup-Umzug)*

1. **Auto-Grow-Textfeld:** `#dream-content` wächst mit dem Inhalt
   (Input-Listener setzt `height = scrollHeight`; zusätzlich modernes
   `field-sizing: content` als progressive enhancement).
   `min-height`: ~40 vh ab 900 px Fensterbreite, ~10 Zeilen mobil.
   Schreib-Typografie: 17–18 px, `line-height: 1.65` — nur im
   Traumtext-Feld, nicht global.
2. **Erst erzählen, dann benennen:** Titel + Datum ziehen unter das
   Textfeld (eine Zeile, Titel breit / Datum schmal). Einziger
   Markup-Umzug dieser Stufe; IDs und `journal.js`-Logik unverändert.
3. **Zwei Spalten ab 900 px:** `#dream-form` wird CSS-Grid — links
   Schreibfläche (sticky bei langem rechten Teil), rechts alle übrigen
   Felder. Das `main`-Limit (720 px) wird nur bei geöffnetem Formular
   im Journal-Tab auf ~1080 px angehoben (Klasse am `main`, von
   `journal.js` beim Öffnen/Schließen gesetzt). Unter 900 px: exakt
   heutige Einspaltigkeit.
4. **Luft:** Abstands-Skala im Formular vereinheitlichen (ein
   `--form-gap` statt gewachsener Einzelabstände); Label-Zeilen bekommen
   konsistenten Abstand zur Feldgruppe darüber.
5. **Sticky Aktionen:** `form-actions` (Speichern/Abbrechen) haften am
   unteren Rand, sobald das Formular höher als der Viewport ist
   (`position: sticky; bottom: 0` + Hintergrund, Rotlicht-tauglich).
6. **Toggle „Klassische Maske":** unauffälliger Chip im Formularkopf
   (localStorage `form-classic`, zweisprachig). AN = einspaltig, altes
   720-px-Limit, Textfeld fix 6 Zeilen — der heutige Look. Der Toggle
   wird in M.2/M.3 erweitert und bleibt bis zur M.5-Entscheidung.

**Verifikation (Browser, beide Toggle-Zustände):** 412 px + Desktop,
Rotlicht, langer Text (Auto-Grow + Sticky), Traum mit ALLEN Feldern
anlegen und bearbeiten → Paritäts-Checkliste.

## Stufe M.2: Vier Gruppen-Karten  *(Markup-Reorganisation)*

Felder in vier `<fieldset>`-Karten mit Emoji-Titel, in dieser Reihenfolge
(rechte Spalte im Desktop-Grid, mobil unter der Schreibfläche):

1. **💭 Der Traum** — Luzidität, Emotionen. *(Offen.)*
2. **🧩 Elemente** — Traumzeichen, Orte, Personen, Tags. *(Offen.)*
3. **😴 Die Nacht** — Schlafzeit-Block (`#night-section`),
   Schlafqualität, Substanzen (4 Checkboxen + Sonstiges). *(Eingeklappt.)*
4. **✨ Besonderes** — ⭐ Großer Traum, Phänomene (5), eigene
   Analyse/Notizen. *(Eingeklappt.)*

- Eingeklappte Karten zeigen eine **Zusammenfassungs-Zeile** mit dem,
  was bereits gesetzt ist („😴 Die Nacht · 7 h 15 · Qualität 4" bzw.
  „· noch nichts erfasst") — beim Bearbeiten eines Traums sieht man so
  ohne Aufklappen, was drinsteht. Aufklapp-Zustand pro Karte in
  localStorage.
- **Beim Aufklappen wird nichts nachgeladen** — alle Felder sind im DOM
  (das Formular ist klein; anders als bei den Analyse-Charts gibt es
  hier nichts zu rendern). Damit bleibt auch die Offline-Outbox-Logik
  unberührt.
- Traum-Echos (`#dream-echoes`) bleiben direkt unter der Schreibfläche.
- **Klassische Maske:** alle vier Karten fest aufgeklappt, keine
  Zusammenfassungs-Zeilen — zusammen mit M.1-Toggle ein Zustand.
- **Andock-Kommentare** im Markup: `<!-- E.3 hier -->` etc. an den vier
  Karten, damit die E-Stufen ihre Felder an den geplanten Platz setzen.

**Verifikation:** Paritäts-Checkliste in beiden Toggle-Zuständen;
Zusammenfassungs-Zeilen bei leerem/vollem Traum; Datumswechsel lädt
`#night-section` weiterhin korrekt (bestehende Logik).

## Stufe M.3: Chips — ein Tap statt Dropdown  *(Eingabe-Komfort)*

**Grundregel für den Rückweg: Die nativen Felder bleiben die Quelle der
Wahrheit.** Chips sind eine Bedien-Schicht, die dieselben Felder setzt —
`journal.js` liest beim Speichern exakt dieselben Inputs wie heute.

1. **Luzidität:** 5 Chips (0–4, mit den heutigen Beschriftungen als
   Kurzform + Tooltip/Zweitzeile). Setzen `#dream-lucidity`
   (visually-hidden, im klassischen Modus wieder sichtbar als Select).
2. **Schlafqualität:** 5 Punkte-Chips (1–5) + „–" zum Abwählen; setzt
   `#dream-sleep` analog.
3. **Element-Chip-Eingabe** für Zeichen/Orte/Personen/Tags: Tippfeld
   mit Vorschlags-Chips aus dem Bestand (häufigste zuerst; ersetzt die
   `datalist`-Bedienung), bestätigte Einträge werden entfernbare Chips.
   Intern wird weiterhin der **kommagetrennte String in die bestehenden
   Inputs** geschrieben (`#dream-signs` usw., visually-hidden) — Payload
   und `splitList`-Logik bleiben unangetastet. Vorschläge normalisieren
   Schreibweisen (exakter Bestandsname gewinnt) → Datenqualität für die
   Verbindungs-Analysen.
4. Substanzen/Phänomene bleiben Checkboxen (sind schon tap-freundlich);
   nur CSS-Angleichung an die Chip-Optik.
5. **Klassische Maske:** Chip-Schichten ausgeblendet, native
   Selects/Inputs sichtbar — der heutige Bedienweg, jederzeit.

**Verifikation (kritischste Stufe):** Einen Traum mit allen Feldern
anlegen, speichern, wieder öffnen, in der klassischen Ansicht prüfen,
erneut in der Chip-Ansicht bearbeiten — Werte müssen verlustfrei durch
beide Bedienwege wandern. Netzwerk-Tab: Payload identisch zu vorher.
Offline-Fall: Outbox-Eintrag über Chips erstellt → nach Reconnect korrekt
synchronisiert.

## Stufe M.4: Lesen ≠ Bearbeiten + Entwurf-Sicherung  *(additiv)*

1. **Lese-Ansicht:** Tap auf einen Traum in der Liste öffnet ein
   Lese-Overlay statt direkt des Formulars: große Serif-Typografie
   (Stil des Lesezimmers wiederverwenden, nicht duplizieren), darunter
   die Merkmale kompakt als Chips/Zeilen, Stift-Icon → heutiges
   Formular. Von dort auch der Sprung zu Jung-Analyse/Reflexionen
   (bestehende Wege verlinken).
   **Einstellung „Tippen öffnet direkt das Formular"** (localStorage)
   stellt den heutigen Fluss wieder her.
2. **Entwurf-Sicherung:** Textfeld/Titel/Datum werden beim Tippen
   (debounced, ~2 s) nach localStorage gesichert (`dream-draft`, nur
   für NEUE Träume — beim Bearbeiten gilt der Server-Stand). Wird das
   Formular mit vorhandenem Entwurf geöffnet: dezente Zeile
   „Entwurf vom 17.07., 14:32 wiederherstellen? [Ja] [Verwerfen]".
   Nach erfolgreichem Speichern wird der Entwurf gelöscht. Kein
   Konflikt mit der Offline-Outbox: Der Entwurf ist VOR dem Absenden,
   die Outbox NACH dem Absenden zuständig.

**Verifikation:** Lese-Ansicht DE/EN + Rotlicht + 412 px; Entwurf
überlebt Tab-Wechsel und App-Neustart; Entwurf-Prompt erscheint nicht
beim Bearbeiten bestehender Träume.

## Stufe M.5: Praxistest & Entscheidung

**Zwei Wochen echte Nutzung** auf `maske-ux` (Not-Ausgang: Toggle
„Klassische Maske" bzw. `git checkout main`). Danach:

1. Wurde der Toggle benutzt? Nie → Toggle-Code entfernen (Aufräum-Commit).
   Dauerhaft an → Stufen M.1–M.3 gezielt reverten, M.4 behalten
   (Lese-Ansicht und Entwurf sind unabhängig vom Layout wertvoll).
2. Öffnest du „Die Nacht"/„Besonderes" praktisch immer? → Default auf
   offen drehen (eine Zeile).
3. Danach Merge in `main`; `docs/HANDBUCH.md` (neue Maske, Lese-Ansicht,
   Entwurf) nachziehen. `docs/ARCHITEKTUR.md` braucht nichts (kein
   API-Change).

---

## Feld-Paritäts-Checkliste (Akzeptanzkriterium jeder Stufe)

Nach jeder Stufe müssen alle Merkmale erfassbar sein und korrekt
gespeichert werden — anlegen UND bearbeiten:

- [ ] Traumtext (`content`) · Titel · Datum
- [ ] Erinnerung/Luzidität (0–4) · Schlafqualität (1–5, abwählbar)
- [ ] Schlafzeit-Block (`#night-section`: Zeiten / grob / weiß nicht,
      inkl. Laden bei Datumswechsel)
- [ ] Substanzen: Beifuß, Melatonin, Alkohol, Weed + Sonstiges-Freitext
- [ ] ⭐ Großer Traum
- [ ] Phänomene: Falsches Erwachen, Schlafparalyse, Traum-im-Traum,
      Wiederkehrend, Albtraum
- [ ] Emotionen (Picker, 12)
- [ ] Traumzeichen · 📍 Orte · 👤 Personen · Tags (inkl. Vorschläge)
- [ ] Eigene Analyse / Notizen
- [ ] Traum-Echos erscheinen weiterhin beim Schreiben
- [ ] Offline-Outbox: neuer Traum ohne Server landet in der Outbox

**Backend-Tests:** keine nötig (kein API-Change) — die bestehende Suite
muss unverändert grün bleiben (Beleg, dass wirklich nichts am Server
geändert wurde).
