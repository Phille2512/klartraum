# Offene Punkte (Stand: 18.07.2026)

## Branches (keiner gemerged)

- **`main`** — stabiler Alltags-Stand (zuletzt E.2, n-Badges)
- **`dashboard-ux`** — D.1–D.4 fertig, wartet auf D.5-Praxistest
- **`maske-ux`** — M.1–**M.4 fertig** (Luft & Bühne, Gruppen-Karten, Chip-Eingabe, Lese-Ansicht + Entwurf-Sicherung), wartet auf M.5

## Nächste konkrete Schritte

- **M.5** — zwei Wochen Praxistest, dann Merge-Entscheidung (Kriterien laut Plan: Toggle-Nutzung auswerten, Default-Aufklapp-Zustand der Karten ggf. anpassen)
- **D.5** — zwei Wochen Praxistest Dashboard, dann Merge-Entscheidung
- **E.3–E.7** — Erinnerungs-Block, Nacht-/Tageskontext, … (Andock-Kommentare `<!-- E.3 hier -->` usw. stehen seit M.2 im Formular-Markup)
- **V.1–V.5** — Verbindungen-Plan, brandneu, noch nicht angefasst
- **SCHLAFSCHULE (SS.1–…)** — brandneuer Plan (von Fable während dieser Session ergänzt): eigener „😴 Schlaf"-Analyse-Bereich + Wissen im Lernen-Tab, Anlass ist der jetzt vorhandene Xiaomi Smart Band 10. TD-Andockpunkte in `UMSETZUNGSPLAN-TRACKERDATEN.md` entsprechend nachgezogen. Noch nicht angefasst.
- **TRACKERDATEN (TD.2)** — bleibt ausdrücklich blockiert, bis echte Tracker-Export-Dateien vorliegen (Philipp sammelt seit Kauf des Xiaomi Smart Band 10 ~2 Wochen Daten) — beide Pläne bestätigen das erneut, trotz vorhandener Hardware

## Offene Fäden

- **M.4-Verifikation:** Tap auf Titel/Text öffnet die Lese-Ansicht (große Typografie, alle Merkmale als Badges, Sprung zu Bearbeiten/Reflexion/Jung-Analyse — dabei musste ich einen z-index-Konflikt fixen: Reflexion/Jung-Analyse-Overlays liegen unter dem wiederverwendeten Lesezimmer-Overlay, also schließt die Lese-Ansicht sich jetzt selbst, bevor sie zu ihnen springt). Toggle „Tippen öffnet Formular" schaltet auf den alten Direkt-Bearbeiten-Fluss zurück, geprüft. Entwurf-Sicherung geprüft: Autosave nach 2 s Tipppause, übersteht Abbrechen, Wiederherstellen-Prompt mit korrektem Datum/Zeit-Format, erscheint nicht beim Bearbeiten bestehender Träume, Autosave bleibt beim Bearbeiten inaktiv. Alles per echten Klicks/Timern im Browser getestet (DE+EN, Rotlicht, Desktop), 412 px nicht extra für M.4 wiederholt (Lesezimmer-Klassen sind dort bereits erprobt). Backend-Suite unverändert grün (141 passed) — kein API-Change.
- **Gefundener und gefixter Bug (18.07., Commit `86bacf5`):** Bei allen sechs M.3-Feldern (Luzidität, Schlafqualität, Traumzeichen, Orte, Personen, Tags) löschte ein Klick auf scheinbar leeren Raum im Feld (entsteht z. B. durch CSS-Grid-Stretch bei Orte/Personen nebeneinander) versehentlich einen Eintrag bzw. änderte den Wert — Ursache war ein `<label>` ohne `for`-Attribut, das den Klick an den ersten fokussierbaren Nachfahren weiterleitete (oft der ✕-Button der ersten Pill). Behoben durch explizites `for` auf jedem Label. Bitte einmal kurz gegentesten, ob sich das jetzt richtig anfühlt.
- **M.3-Verifikation:** Luzidität-/Schlafqualität-Chips, Element-Pills (Hinzufügen/Entfernen/Vorschlag-Klick/Backspace), Normalisierung auf Bestandsschreibweise, Dedupe und der Klassik-Toggle-Resync (native Bearbeitung überschreibt Chips nicht) sind alle im Browser durchgetestet — per echten Klicks bzw. per Enter/Komma-Commit (letzteres nur synthetisch geprüft, da der Test-Browser bei der virtuellen Enter-Taste ein leeres `KeyboardEvent` liefert; der Blur-Pfad mit echten Klicks funktioniert und ist der praxisrelevante Weg). Der volle Server-Roundtrip (Speichern mit echtem Login, Netzwerk-Payload-Diff) steht weiterhin aus — der Test-Browser hat auf Port 8001 keinen Auth-Token. Backend-Suite unverändert grün (141 passed), Payload-Konstruktion in `save()` nicht angefasst.
- **M.2-Restprüfung** (weiterhin offen, gleicher Grund): echter Speicher-Roundtrip mit Login steht aus.
- Der vermutete Zusammenhang zwischen dem behobenen Duplikat-Namen-Bug und dem Fehler beim Freund ist unbestätigt — falls der nochmal auftritt, wäre ein echter Traceback Gold wert.
- Die UMSETZUNGSPLAN-Dateien (MASKE, VERBINDUNGEN, SCHLAFSCHULE neu; DASHBOARD, ERKENNTNISSE, TRACKERDATEN geändert) sind weiterhin **nicht committet** — bewusst so gelassen, ggf. gesammelt auf `main` einchecken.
