# 🌐 Umsetzungsplan „Zweisprachigkeit": Deutsch ⇄ Englisch

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Konventionen, Fallstricke).
>
> **Ziel:** Die komplette Oberfläche von Traumader ist auf Deutsch und
> Englisch nutzbar, umschaltbar per 🌐-Knopf im Header. **Nutzerdaten
> (Traumtexte, Tags, Orte, Personen, Notizen) werden NIEMALS übersetzt.**
> „Traumader" bleibt in beiden Sprachen der Name der App (Eigenname).

**Charakter der Aufgabe:** Technisch einfach, aber die größte Fleißarbeit der
Projektgeschichte — hunderte Strings in ~12 JS-Modulen plus mehrere tausend
Wörter Inhalts-Texte. Systematisch Modul für Modul arbeiten, nichts „nebenbei"
mitverbessern.

---

## Stufe I.1: i18n-Infrastruktur

1. **Neues Modul `frontend/js/i18n.js`** (VOR allen anderen Skripten laden,
   in `sw.js`-SHELL aufnehmen):
   ```js
   const I18N = {
     de: { "journal.save": "Speichern", "journal.saved": "Traum gespeichert 🌙", … },
     en: { "journal.save": "Save",      "journal.saved": "Dream saved 🌙", … },
   };
   const lang = localStorage.getItem("lang")
     || (navigator.language?.startsWith("de") ? "de" : "en");

   function t(key, vars = {}) {
     let s = I18N[lang]?.[key] ?? I18N.de[key] ?? key;   // Fallback: Deutsch, dann Schlüssel
     for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
     return s;
   }
   ```
   Platzhalter-Syntax: `t("atlas.balance", {shown: 12, total: 40})` →
   „{shown} von {total} Elementen sichtbar“ / “{shown} of {total} elements visible”.
2. **Statisches HTML:** Elemente in `index.html` erhalten `data-i18n="key"`
   (Textinhalt), `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-aria`.
   Eine Funktion `applyI18n()` läuft beim Start über alle Attribute.
   `<html lang>` wird mitgesetzt.
3. **Umschalter:** 🌐-Knopf im Header (neben 🔴/🌙). Klick: Sprache in
   localStorage tauschen, dann **`location.reload()`** — bewusst kein
   Live-Re-Rendering aller Module (fehleranfällig, den Aufwand nicht wert;
   ein Reload beim Sprachwechsel ist völlig akzeptabel).
4. **Datum/Zahlen:** `formatDate` nutzt `de-DE`/`en-US` je nach Sprache;
   Kalenderwochen-Beschriftung „KW“ → „W“.
5. **Konvention verankern:** In `UMSETZUNGSPLAN.md` Teil A als neue Regel
   ergänzen: *„9. Zweisprachigkeit: Jeder neue UI-Text läuft über `t()` mit
   Eintrag in BEIDEN Sprachen — niemals hart kodieren. Pläne liefern neue
   Texte künftig deutsch und englisch."*

**Akzeptanz:** Umschalter wechselt Sprache und überlebt Reload;
Browser-Sprache bestimmt den Erststart-Default; fehlender Schlüssel fällt
sichtbar auf Deutsch zurück (kein leerer Text).

## Stufe I.2: Extraktion der Kern-UI

Modul für Modul alle sichtbaren Strings in Schlüssel umziehen — Checkliste:

- [x] `index.html` (Tabs, Formular-Labels, Buttons, Overlays → `data-i18n`) —
      Tagebuch-, Analyse-, Atlas- und Lernen-Tab sowie Login-/Abendritual-/
      Morgen-Flow-Overlay fertig. Verbleibende Overlays (Reflexion, Aktive
      Imagination, Analyse-Stationstexte, Traumfaden) sind Content und
      gehören zu I.3.
- [x] `journal.js` (Toasts, Leerzustände, Luzuditäts-Labels, confirm()-Texte,
      Echos, Morgen-Rückfrage; **EMOTIONS**: Schlüssel `angst`, `freude` …
      bleiben unverändert in der Datenbank — nur `label` wird `t()`-basiert).
      EMOTIONS/PHENOMENA/SUBSTANCES bekommen `label` als Getter statt festem
      String — dadurch übersetzen sich auch `stats.js`/`lesezimmer.js` mit,
      ohne dort etwas ändern zu müssen. `lesezimmer.js` (noch nicht Teil des
      ursprünglichen Plans, da nach dessen Verfassen gebaut) ebenfalls erledigt.
      Reflexionsfragen, Jung-Analyse-Stationstexte und der Traumfaden-Inhalt
      bewusst NICHT übersetzt (gehören zu I.3).
- [x] `stats.js` (Kartentitel, Chart-Datasets/Achsen, Aufriss-Labels,
      Export-Toasts). COMPASS-Objekt (Kategorien + Missionen),
      ARCHETYPE_LEXICON, `renderMission()`/`openPicker()`/`renderSorter()`
      bewusst NICHT übersetzt (Kompass-Missionen/Archetypen-Lexikon sind I.3).
      `atlas.ARCHETYPES[key].label` wird referenziert, aber erst mit
      `atlas.js` übersetzt. Wochentags-Kürzel und Split-Gruppennamen kommen
      unübersetzt vom Backend (I.4).
- [x] `atlas.js` / `worldmap.js` / `innenwelt.js` (Filterleiste, Bilanz-Zeile,
      Fokus, Werkzeuge, Hinweiszeilen, ARCHETYPES-Labels/-Hints, Dossier).
      `innenwelt.js`: SECTOR_SUBTITLES als Getter wie ARCHETYPES; introCard()-Inhalt
      (Erklärtext „Was ist die Innenwelt-Bühne?") bewusst NICHT übersetzt — gehört
      wie AMPLIFICATION_PROMPTS zu I.3.
- [x] `learn.js` (Reminder/WBTB/Bucket-List-UI, „Deine Daten"-Karte,
      Erst-Start-Hinweis „Wo liegen deine Daten?", index.html-Tab). Guide-INHALTE
      (JUNG_GUIDES, ARCHETYPE_LEXICON, TRAUMFADEN, `learn.guides`) bewusst
      NICHT übersetzt — kommen in I.3.
- [x] `auth.js`, `offline.js`, `app.js` (Login/Setup, Offline-Hinweise,
      Abendritual-UI), `mandala.js`, `hilfe.js`/`wissen.js` (nur UI-Rahmen).
      HILFE- und WISSEN-Inhalte (was/wie/wozu, Wissens-Texte) bewusst NICHT
      übersetzt — Content, kommt in I.3. Hinweis in `app.js` hinterlegt: der
      `h2.textContent.includes("Traumkompass")`-Check funktioniert nur, weil
      die Kompass-Überschrift ebenfalls unübersetzt bleibt.
- [x] `aria-label`s und `<title>` — geprüft: alle dynamisch gesetzten
      aria-labels/titles laufen über `t()`; verbleibend unübersetzt sind nur
      `<title>Traumader</title>` (Eigenname) und `aria-label="Der Traumfaden"`
      (Feature-Name, gehört zu TRAUMFADEN-Content, I.3).

Schlüssel-Namenskonvention: `modul.zweck` (`journal.deleteConfirm`,
`atlas.focus`). Bei Strings mit eingebautem `escapeHtml(...)`: Interpolation
über `t()`-Platzhalter, Escaping bleibt außerhalb des Wörterbuchs.

**Akzeptanz:** In EN-Modus jeden Tab + jedes Overlay durchklicken — kein
deutsches Wort mehr sichtbar (außer Nutzerdaten); Layout bricht nirgends
(englische Strings sind mal kürzer, mal länger — 412 px prüfen).

## Stufe I.3: Inhalts-Übersetzung (die großen Texte) — ✅ abgeschlossen (2026-07-14)

Betrifft: Klartraum-Guides, Jung-Kompendium (9 Kapitel), Archetypen-Lexikon,
Traumfaden, ⓘ-Hilfe- und 💡-Wissens-Texte, Reflexionsfragen,
Amplifikations-Impulse, Kompass-Missionen, Stationstexte der
Traum-Jung-Analyse, „Deine Daten"-Text, Disclaimer-Fußzeile.

**Stand:** Alle oben genannten Inhalte sind übersetzt und über `t()`
verdrahtet — `learn.js` (`TRAUMFADEN`, `learn.guides`, `JUNG_GUIDES`,
`ARCHETYPE_LEXICON`, Jung-Kompendium-/Lexikon-Überschriften), `journal.js`
(`reflectionQuestions`, `ANALYSIS_STATIONS`), `atlas.js`
(`AMPLIFICATION_PROMPTS`), `stats.js` (`COMPASS` + Mission/Sorter/Picker-UI,
Traumkompass-Überschrift in `index.html`), `hilfe.js` (`HILFE`), `wissen.js`
(`WISSEN`). „Deine Daten"-Text wurde schon in I.2 mitübersetzt (`learn.js`).
Keine dedizierte Disclaimer-Fußzeile im Code gefunden — die Funktion
übernimmt das Kapitel „🔍 Ehrliche Einordnung" im Jung-Kompendium.
Offen/nicht Teil dieser Stufe: `innenwelt.js` `introCard()` (Erklärtext
„Was ist die Innenwelt-Bühne?", stand nicht explizit auf der Liste,
Kandidat für einen kleinen Folge-Pass).
Der `app.js`-Kommentar zum `Traumkompass`-Textabgleich ist erledigt:
Überschrift hat jetzt `id="compass-heading"`, `hilfe.attach()` nutzt die ID
statt Textvergleich.

**Qualitätsmaßstab:** Idiomatisches Englisch im selben warmen Du-Ton
(englisch: direktes „you"), keine Wort-für-Wort-Übersetzung. Emojis und
Struktur bleiben identisch.

**Verbindliches Glossar (Fachbegriffe mit etablierten englischen Termini):**

| Deutsch | Englisch | Anmerkung |
|---|---|---|
| Klartraum / luzide | lucid dream / lucid | |
| Traumzeichen | dreamsign | LaBerges eigene Schreibweise |
| Traumfaden | the Dream Thread | Feature-Name, Großschreibung |
| Innenwelt | Inner World | |
| Traumkompass | Dream Compass | |
| Traumweltkarte | Dream World Map | |
| Abendritual | Evening Ritual | |
| Morgen-Rückfrage | morning check-in | |
| Großer Traum ⭐ | big dream | Jungs Begriff in der Literatur |
| Aktive Imagination | active imagination | |
| Trauminkubation | dream incubation | |
| Beifuß | mugwort | |
| Erinnerungs-Score | recall score | |
| Reality Check, MILD, WBTB | unverändert | sind schon englisch |
| Der Schatten | the Shadow | |
| Anima/Animus, Persona, Trickster | unverändert | |
| Der/die Weise | the Sage | |
| Das Kind | the Child | |
| Held/in | the Hero | |
| Große Mutter | the Great Mother | |
| Kompensation | compensation | |
| Amplifikation | amplification | |
| Synchronizität | synchronicity | |
| Traumserie | dream series | |
| Ort der Woche | Place of the Week | |
| Nebel des Unerforschten | fog of the unexplored | |

**Emotionen** (Schlüssel bleiben deutsch in der DB!): angst→fear,
freude→joy, staunen→awe, trauer→sadness, wut→anger, liebe→love,
neugier→curiosity, verwirrung→confusion, frieden→peace, ekel→disgust,
sehnsucht→longing, scham→shame.

**Akzeptanz:** Alle Inhalts-Ansichten in EN gegenlesen (Kompendium, Lexikon,
Traumfaden, eine komplette Jung-Analyse an einem Testtraum); Glossar-Begriffe
konsistent verwendet.

## Stufe I.4: Backend-Meldungen & Feinschliff

1. **Fehler-Codes statt deutscher Texte:** `HTTPException(404, "not_found")`,
   `401 → "wrong_password"` / `"not_authenticated"`, `409 → "duplicate"` usw.
   `api.js` übersetzt: `t("err." + detail)`, unbekannte Codes werden roh
   angezeigt. Alle `raise HTTPException` in `main.py` durchgehen (~25 Stück).
2. **Manifest:** bleibt statisch — `name: "Traumader"`,
   `description` englisch (internationaler kleinster Nenner),
   `short_name: "Traumader"`. Kein Sprach-Manifest-Gefrickel.
3. **Nicht in diesem Plan:** Übersetzung von `docs/` und
   `ANLEITUNG-FUER-FREUNDE.md` (kann später folgen, wenn englischsprachige
   Freunde real werden — dann als eigene kleine Stufe).
4. `sw.js`: `i18n.js` in SHELL, Version bumpen.

**Akzeptanz:** Falsches Passwort in EN-Modus zeigt „Wrong password“;
Offline-/Auth-Fehlerpfade in beiden Sprachen geprüft; pytest (falls
vorhanden) auf Codes statt Texte angepasst.

---

## Reihenfolge & Grundsätze

```
I.1 Infrastruktur → I.2 Kern-UI → I.3 Inhalte → I.4 Backend & Feinschliff
```

- **Reine Umzugsarbeit:** Während der Extraktion keine Texte „verbessern“ —
  erst 1:1 umziehen (Verhalten identisch), Wortlaut-Änderungen wären eigene
  Commits. Sonst ist bei Fehlern unklar, was sie verursacht hat.
- Pro Stufe: Desktop + 412 px + Rotlicht in BEIDEN Sprachen stichprobenartig,
  `sw.js` bumpen, ein Commit.
- Ab sofort gilt Regel 9 (Teil A): neue Features liefern Texte zweisprachig.
