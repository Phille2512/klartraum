# 🧭 Umsetzungsplan „Verstehen & Bedienen": Atlas-Reparatur, Hilfe-System, Archetypen-Lexikon, Prozess-Intro

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Konventionen, Fallstricke).
> UI-Sprache: Deutsch.
>
> **Anlass — Nutzerfeedback (Juli 2026):** Nach der Atlas-Optimierung (B.1)
> ist der Traumatlas praktisch unbrauchbar: keine Namen erkennbar, fast leerer
> Graph, Bedienung unklar. Außerdem gewünscht: klickbare Hilfe für alle
> Atlas-Komponenten, nachlesbare Archetypen-Beschreibungen mit Bezug zur
> eigenen Analyse, und ein Intro, das den gedachten Dokumentations- und
> Analyse-Prozess erklärt.

---

## Stufe H.1: Atlas-Reparatur  *(Regression aus B.1 — zuerst!)*

**Diagnose (verifizieren, dann fixen):**
1. **Label-Regel bestraft kleine Datenmengen.** B.1 Punkt 4 („Namen nur bei
   count ≥ 2“) blendet bei überwiegend 1×-Elementen fast alle Namen aus.
2. **Persistierte Filter wirken unsichtbar.** `atlas-min-count`,
   `atlas-range`, `atlas-kinds` und ggf. `atlas-timelapse-to` überleben in
   localStorage — ein alter Testzustand (z. B. ≥2× + 30 Tage + Zeitraffer in
   der Vergangenheit) reduziert den Graphen auf Reste, ohne dass der Nutzer
   sieht, warum.

**Umsetzung:**
1. **Adaptive Beschriftung:** Sind ≤ 15 Knoten sichtbar → ALLE Namen zeigen.
   Erst darüber greift die Hygiene-Regel (count ≥ 2 oder Radius > 15 px).
2. **Sichtbarkeits-Bilanz immer anzeigen:** Über dem Graphen eine Zeile
   „**12 von 40 Elementen sichtbar** · Filter: ≥2×, 30 Tage ·
   [Filter zurücksetzen]“. Der Reset-Chip erscheint immer, wenn Filter
   irgendetwas ausblenden, und setzt min_count=1, Zeitraum=Alles, alle Arten
   an, Zeitraffer=heute, Fokus aus.
3. **Sanfte Defaults:** Erstzustand (und nach Reset) zeigt alles; die
   Top-20-Grenze greift erst ab > 20 Elementen (dann mit deutlichem
   „+ N weitere anzeigen“-Chip direkt unterm Graphen, nicht versteckt).
4. **Zeitraffer-Zustand nicht persistieren:** `atlas-timelapse-to` fliegt aus
   localStorage — der Zeitraffer startet immer bei „heute“. (Ein in der
   Vergangenheit geparkter Slider ist die perfekte Verwirrungsmaschine.)
5. **Leere-Filter-Zustand:** Filtert die Kombination alles weg → statt leerem
   SVG eine freundliche Karte: „Deine Filter verstecken gerade alle N
   Elemente. [Filter zurücksetzen]“.
6. Prüfen, dass Serienansicht (Antippen) und Fokus-Modus nach den Änderungen
   funktionieren; **mit realistischem Bestand testen:** einmal mit 5 und
   einmal mit 40 Skript-Elementen (danach restlos löschen).

**Akzeptanz:** Mit 5 Elementen: alle Namen sichtbar, kein Filter aktiv, Graph
sofort verständlich. Mit 40: lesbar, Bilanz-Zeile stimmt, Reset stellt in
einem Tipp den Vollzustand her.

---

## Stufe H.2: Klickbare Hilfe für alle Atlas-Komponenten

**Mechanik:** Neues, wiederverwendbares Muster in `frontend/js/hilfe.js`
(analog zu `wissen.js`, aber für **Bedienung** statt Konzepte):
- Jede Karten-/Ansichts-Überschrift bekommt rechts ein dezentes **ⓘ** (mit
  `aria-label="Hilfe"`). Tipp öffnet ein Overlay (Muster: Login-Overlay) mit
  drei festen Abschnitten: **Was ist das? · Wie benutze ich es? · Wozu?**
- `hilfe.attach(headerEl, schlüssel)`; Inhalte als Konstante in `hilfe.js`.
- Kein Auto-Aufklappen (das machen die 💡-Wissens-Momente) — Hilfe ist
  ausschließlich auf Abruf.

**Pflicht-Schlüssel und verbindliche Inhalte** (Implementierer übernimmt,
darf sprachlich glätten):

- **`atlas-netz`** — *Was:* Alle Elemente deiner Träume (📍 Orte, 👤 Personen,
  🔮 Traumzeichen) als Netz; verbunden, was im selben Traum vorkam; je öfter
  geträumt, desto größer. *Wie:* Element antippen → alle Träume damit
  („Traumserie“). „🎯 Fokussieren“ zeigt nur ein Element + Nachbarn. Oben
  filtern nach Art, Häufigkeit, Zeitraum; Schieberegler unten = Zeitreise.
  *Wozu:* Wiederkehrendes erkennen — deine besten Kandidaten für Reality
  Checks.
- **`atlas-karte`** — *Was:* Deine Traumorte als selbst gelegte Landkarte;
  Nebel liegt über Unerforschtem. *Wie:* Werkzeug wählen (✋ Bewegen ·
  📍 Platzieren · 🚶 Weg · 🗑️ Entfernen), Hinweiszeile sagt jeweils, was zu
  tun ist; unkartierte Orte warten in der Ablage. *Wozu:* Eine mentale Karte
  der Traumwelt aufbauen — Orte, die man „kennt“, erkennt man im Traum wieder,
  und Wiedererkennen macht luzide.
- **`atlas-innenwelt`** — *Was:* Die Menschen deiner Träume als Bühne um dein
  „Selbst“; die Felder sind Rollen nach C. G. Jung (Archetypen). *Wie:* Figur
  antippen → Geschichte, Gefühle, Gespräche; Figuren ohne Rolle stehen außen —
  antippen und einsortieren. *Wozu:* Sehen, wer dein Innenleben bevölkert und
  welche Rollen dominieren; über „Gespräch fortsetzen“ mit Figuren in Dialog
  gehen. → Link „Was sind Archetypen?“ (öffnet H.3-Lexikon).
- Ebenfalls anbinden (Kurztexte nach gleichem Schema): `kompass`, `mandala`,
  `innenwelt-dossier`, `analyse-aufriss`, `zeitraffer`.

**Akzeptanz:** Jede der drei Atlas-Ansichten hat ein ⓘ; Overlays mobil lesbar
(412 px) und im Rotlicht-Modus; Schließen per ✕ und Tipp auf den Hintergrund.

---

## Stufe H.3: Archetypen-Lexikon — nachlesen und aufs Eigene beziehen

**Ziel:** Wer „Trickster“ noch nie gehört hat, kann es in 60 Sekunden
verstehen — und sieht sofort, was das mit den **eigenen** Träumen zu tun hat.

**Inhalte (verbindlich; je Archetyp: Kern · im Traum · Frage an dich):**

1. **🌑 Der Schatten** — *Kern:* Alles, was du nicht sein willst, verschwindet
   nicht — es wird zu deinem Schatten. Er ist kein „Böses“, sondern
   ungelebtes Leben: verdrängte Wut, verbotene Wünsche, ungenutzte Stärke.
   *Im Traum:* Verfolger, Einbrecher, abstoßende oder beschämende Figuren;
   oft gleichgeschlechtlich. *Frage:* Was an dieser Figur kenne ich — und
   will es nicht wahrhaben?
2. **🌗 Anima / Animus** — *Kern:* Jungs Name für die innere Gegenstimme —
   das Unvertraute in dir, klassisch gegengeschlechtlich gedacht, heute
   weiter gelesen. Sie ist Brücke zum Unbewussten: was dich rätselhaft
   anzieht, will dir etwas zeigen. *Im Traum:* faszinierende Unbekannte,
   Führerinnen/Führer, unerreichbare Geliebte. *Frage:* Welche Seite von mir
   spricht hier, die im Alltag keinen Platz hat?
3. **🧙 Der/die Weise** — *Kern:* Die Stimme des gesammelten Wissens — der
   innere Mentor, der auftaucht, wenn du weiter bist, als du glaubst.
   *Im Traum:* alte Frau/alter Mann, Lehrer, sprechende Tiere mit Rat,
   Stimmen, die einfach *wissen*. *Frage:* Welchen Rat habe ich gehört —
   und traue ich ihm?
4. **🧒 Das Kind** — *Kern:* Anfang und Möglichkeit: das Verspielte,
   Verletzliche, Neue. Oft kündigt es Entwicklung an — etwas in dir ist
   gerade jung. *Im Traum:* Babys, Kinder (auch du als Kind), Neugeborenes,
   das beschützt werden muss. *Frage:* Was in meinem Leben ist gerade klein
   und braucht Schutz — oder will endlich wachsen?
5. **🃏 Der Trickster** — *Kern:* Der Regelbrecher: stört Pläne, blamiert,
   dreht Situationen ins Absurde. Er ist lästig — und heilsam, weil er
   festgefahrene Ordnung aufbricht. *Im Traum:* Clowns, Diebe, Gestaltwandler,
   Figuren, die dich narren; auch absurde Pannen. *Frage:* Welche Ordnung in
   meinem Leben nimmt sich zu ernst?
6. **⚔️ Held/in** — *Kern:* Der Teil, der sich stellt: aufbricht, kämpft,
   über sich hinauswächst. Sein Schatten: Größenwahn und das Nicht-um-Hilfe-
   bitten-Können. *Im Traum:* Prüfungen, Kämpfe, Rettungen, gefährliche
   Reisen. *Frage:* Wofür lohnt sich gerade mein Mut — und wo spiele ich nur
   den Starken?
7. **🌳 Große Mutter** — *Kern:* Das Nährende und Haltende — und seine
   Kehrseite: das Umklammernde, Verschlingende. Beides gehört zu dieser
   Urfigur. *Im Traum:* mütterliche Gestalten, Häuser der Kindheit, Höhlen,
   Meer und Erde; auch Hexen. *Frage:* Wo werde ich gehalten — und wo
   festgehalten?
8. **🎭 Persona** — *Kern:* Deine Maske für die Welt: Rolle, Beruf,
   Höflichkeit. Gesund, solange du sie absetzen kannst; eng, wenn du sie für
   dein Gesicht hältst. *Im Traum:* falsche/fehlende Kleidung, Bühnen,
   Prüfungen, nackt unter Menschen. *Frage:* Wen spiele ich gerade — und für
   wen?

Abschluss-Hinweis unter jedem Text: *„Reflexions-Linse nach C. G. Jung, keine
Diagnose. Die Figur deines Traums ist immer mehr als die Rolle.“*

**Einbau:**
1. **Lexikon-Ansicht:** Im Lernen-Tab als eigener Akkordeon-Block
   „🌗 Die acht Rollen (Archetypen-Lexikon)“ — pro Archetyp ein Eintrag mit
   obigem Text. Jeder Eintrag hat einen Anker (`id="arch-schatten"` …).
2. **Vom Picker aus erreichbar:** Im Archetyp-Picker (Innenwelt/Atlas-Serie)
   unter den Buttons ein Link „Was bedeuten die Rollen? →“ (springt ins
   Lexikon); zusätzlich zeigt langes Drücken/`title` weiter den Kurzhinweis.
3. **Bezug zur Analyse (der wichtige Teil):** In der Analyse-Karte
   „Deine inneren Figuren“ wird jeder Archetyp-Balken **antippbar** → öffnet
   ein Panel darunter: **links** der Lexikon-Text (gekürzt auf Kern + Frage),
   **rechts/darunter deine Daten**: „Bei dir: 3 Figuren (chef, vater, ex) ·
   14 Träume · häufigste Gefühle 😨😤 · zuletzt am 12.07.“ + Figuren antippbar
   (→ Dossier). Backend: `GET /api/innenwelt` liefert die nötigen Felder
   bereits — nur aggregieren.
4. Die 💡-Wissens-Momente (`schatten`, `archetypen`) verlinken ebenfalls ins
   Lexikon statt nur ins Kompendium-Kapitel.

**Akzeptanz:** Vom Picker, von der Analyse und vom Lernen-Tab aus erreichbar;
Analyse-Panel zeigt korrekte eigene Zahlen; Anker springen richtig; mobil gut
lesbar.

---

## Stufe H.4: „Der Weg des Träumers" — das Prozess-Intro

**Ziel:** Neue (und vergessliche) Nutzer verstehen den gedachten Arbeitsfluss:
**füttern, wann es passt — verwerten, wenn Lust da ist.** Kein Pflichtprogramm,
keine perfekten Einträge.

**Verbindlicher Text** (aus Philipps eigener Beschreibung destilliert;
Implementierer darf Feinschliff machen, Kernaussagen bleiben):

> ## 🌙 Der Weg des Träumers — so ist Klartraum gedacht
>
> **1. Festhalten (direkt nach dem Aufwachen · 1 Minute)**
> Schreib auf, was da ist — egal wo: Zettel, Handy-Notiz, Sprachnachricht an
> dich selbst. Ein paar Wörter reichen. Nur eines ist Pflicht: **das Datum**.
> Fällt dir tagsüber mehr ein, häng es einfach an.
>
> **2. Einpflegen (wenn Zeit ist · 5 Minuten)**
> Bring den Text in die App — unverändert und unperfekt. Wenn es leicht von
> der Hand geht, vergib schon ein paar Merkmale: Traumzeichen, Orte, Personen,
> Gefühle. Wenn nicht: auch gut. **Alles lässt sich später ergänzen.**
>
> **3. Anreichern (irgendwann · nebenbei)**
> Bei Lust und Laune: Beschreibungen vervollständigen, Elemente nachtragen,
> Traumzeichen einsortieren, Orte auf die Karte legen. Jeder Handgriff füttert
> deine Traumlandschaft.
>
> **4. Verwerten (wenn Neugier kommt)**
> Schau in die Analyse, den Atlas, die Innenwelt. Geh die Individuationsreise,
> stell einer Traumfigur eine Frage, folge einer Traumserie. Hier zahlt sich
> das Füttern aus.
>
> **Warum das funktioniert:** Klartraum ist eine **persönliche
> Traumlandschaft, die sich mit jedem Eintrag weiter ausbreitet** — und dich
> dir selbst zeigt: wie du dich in diesen absurden Momenten verhältst, was
> wiederkehrt, was sich verändert. Du beobachtest dich in Situationen, die
> kein Wachleben dir bietet — und lernst dich genau dort kennen.
> Füttere sie beiläufig. Ernte, wann du willst.

**Einbau:**
1. **Lernen-Tab, ganz oben** als erste Karte „🌙 Der Weg des Träumers“
   (eingeklappt nach erstem Lesen; Zustand in localStorage).
2. **Erster App-Start** (kein einziger Traum vorhanden): Der Text erscheint
   als Willkommens-Ansicht im Tagebuch-Leerzustand (gekürzt auf die vier
   Schritt-Überschriften + Schlussabsatz) mit Button „Ersten Traum festhalten“.
3. **`docs/HANDBUCH.md`** und **`ANLEITUNG-FUER-FREUNDE.md`**: Abschnitt
   „Der tägliche Rhythmus“ um diesen Vier-Schritte-Prozess ergänzen/ersetzen —
   eine Quelle der Wahrheit, gleicher Wortlaut.

**Akzeptanz:** Neue Installation (leere Test-DB) zeigt das Intro im Tagebuch;
Lernen-Tab-Karte vorhanden und einklappbar; Handbuch & Anleitung aktualisiert.

---

## Reihenfolge & Abschluss

```
H.1 Atlas-Reparatur (dringend!) → H.2 Hilfe-System → H.3 Archetypen-Lexikon
   → H.4 Prozess-Intro
```

Pro Stufe: Desktop + 412 px + Rotlicht prüfen, Testdaten restlos löschen,
`sw.js`-Cache bumpen (neue Datei `hilfe.js` in SHELL), ein Commit.
H.1 unbedingt mit zwei Datenmengen (5 und 40 Elemente) verifizieren — genau
an dieser Stelle ist die letzte Optimierung in die Regression gelaufen.
