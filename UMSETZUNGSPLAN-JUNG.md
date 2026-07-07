# 🌗 Umsetzungsplan „Innenwelt": Das Jung-Erlebnis

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Konventionen, Fallstricke).
> **Voraussetzung:** `UMSETZUNGSPLAN-HORIZONT3.md` ist umgesetzt — dieser Plan
> baut auf H3.1 (Emotionen), H3.3 (Symbol-Lexikon), H3.4 (Archetypen) und
> H3.5 (Aktive Imagination) auf. UI-Sprache: Deutsch.

**Vision dieses Pakets:** Ein intuitives Werkzeug, mit dem Nutzer sich selbst
und ihr Unbewusstes erkunden — und dabei nebenbei verstehen, *warum* sie tun,
was sie tun. Wissen wird nicht als Lehrbuch abgeworfen, sondern im Moment der
Nutzung gereicht.

**Haltung (verbindlich, ergänzt H3):** Die App deutet nie autoritativ; Jung ist
Reflexionsrahmen, nicht Wahrheit. Alle Wissenstexte tragen die Handschrift
„nach C. G. Jung“, und das Kompendium enthält ein ehrliches Einordnungs-Kapitel.
Alles funktioniert offline, ohne KI, ohne Kosten.

---

## Stufe J.1: Das Jung-Kompendium  *(Wissens-Fundament)*

**Ziel:** Kompakte, ehrliche Wissenskapitel im Lernen-Tab — als eigener
Abschnitt „🌗 Die Innenwelt verstehen *(nach C. G. Jung)*“ unter den
bestehenden Klartraum-Guides (gleiches `details.guide`-Akkordeon-Muster,
Inhalte als Konstante in `learn.js`).

**Kapitel mit vollständigem Inhalt** (Implementierer übernimmt die Texte,
leichte HTML-Formatierung wie bei den bestehenden Guides):

1. **🗺️ Die Landkarte der Psyche** — Jung stellte sich das Bewusstsein wie eine
   Insel vor: klein, hell, vertraut. Darunter liegt das *persönliche Unbewusste* —
   Vergessenes, Verdrängtes, nie Beachtetes. Und darunter, so seine kühnste
   These, das *kollektive Unbewusste*: Muster, die alle Menschen teilen, weil
   sie zur menschlichen Grundausstattung gehören — die Archetypen. Träume sind
   in diesem Bild Nachrichten von unterhalb der Wasserlinie. Dein Tagebuch ist
   der Briefkasten.
2. **🔣 Symbole sprechen anders** — Ein *Zeichen* steht für etwas Bekanntes
   (🚻 heißt Toilette). Ein *Symbol* zeigt auf etwas, das sich (noch) nicht
   besser sagen lässt. Deshalb hielt Jung nichts von Traum-Wörterbüchern:
   *Dein* Meer ist nicht *mein* Meer. Seine Methode der **Amplifikation**:
   das Symbol anreichern mit allem, was *dir* dazu einfällt — Erinnerungen,
   Redewendungen, Gefühle. Genau das tut dein Symbol-Lexikon.
3. **⚖️ Kompensation: Träume als Gegengewicht** — Jungs praktischste Idee:
   Träume gleichen die Einseitigkeit des Tages aus. Wer sich nur stark zeigt,
   träumt Schwäche; wer allen gefällt, träumt Konflikt. Die fruchtbarste Frage
   an einen Traum ist darum nicht „Was bedeutet das?“, sondern:
   **„Was ergänzt dieser Traum in meinem Leben gerade?“**
4. **🎭 Die Persona: deine Maske** — Die Persona ist das Gesicht, das du der
   Welt zeigst — Beruf, Rolle, Höflichkeit. Sie ist gesund und nötig. Eng wird
   es, wenn man sie nicht mehr absetzen kann. In Träumen zeigt sich
   Persona-Spannung oft als: falsche Kleidung, Bühnen, Prüfungen, nackt sein.
5. **🌑 Der Schatten: was du nicht sein willst** — Alles, was nicht zu deinem
   Selbstbild passt, verschwindet nicht — es sammelt sich im Schatten. In
   Träumen begegnet er dir als Figuren, die dich abstoßen, ängstigen oder
   wütend machen. Jungs unbequeme Pointe: Was dich an anderen am meisten
   stört, kennt dich. Schattenarbeit heißt nicht, das Dunkle auszuleben,
   sondern es zu *kennen* — dort liegt eingesperrte Lebensenergie.
6. **🌗 Anima & Animus: die innere Gegenstimme** — Jung meinte: In jedem lebt
   eine gegengeschlechtliche Innenfigur als Brücke zum Unbewussten. Heute
   liest man das weiter: die Stimme in dir, die anders ist als dein Alltags-Ich —
   das Unvertraute, Faszinierende, manchmal Irritierende. Traumfiguren, die
   dich rätselhaft anziehen oder führen, sind Kandidaten für diese Linse.
7. **⭕ Das Selbst & die Individuation** — Ziel der Psyche ist für Jung nicht
   Perfektion, sondern **Ganzheit**: die Teile — Persona, Schatten, Innenfiguren —
   kennen und zusammenführen. Diesen lebenslangen Prozess nannte er
   *Individuation*: werden, wer man ist. Sein Symbol dafür: das **Mandala**,
   der Kreis mit Mitte. Jung malte selbst fast täglich eines, als
   Momentaufnahme seiner Innenwelt.
8. **⭐ Große Träume & Synchronizität** — Manche Träume sind anders: bildstark,
   aufwühlend, unvergesslich. Jung nannte sie *große Träume* — Marksteine der
   Individuation (dafür ist dein ⭐). Und manchmal scheint die Außenwelt zu
   antworten: Du träumst vom Zug, am nächsten Tag … Jung nannte bedeutsame
   Koinzidenzen *Synchronizität*. Ob da „etwas dran“ ist, ist offen — als
   Aufmerksamkeitsübung ist das Notieren trotzdem wertvoll.
9. **🔍 Ehrliche Einordnung** — Jung ist einer der einflussreichsten Psychologen
   des 20. Jahrhunderts — und vieles an seiner Lehre ist empirisch schwer
   prüfbar oder umstritten (kollektives Unbewusstes, Synchronizität; die
   historische Anima/Animus-Fassung gilt als zeitgebunden). Diese App benutzt
   Jung als das, was zuverlässig funktioniert: einen reichen **Frage- und
   Reflexionsrahmen**. Die Autorität über die Bedeutung deiner Träume hast du.

**Akzeptanz:** Kapitel als Akkordeons im Lernen-Tab, per Anker verlinkbar
(`id="jung-schatten"` usw. — J.2 braucht das); Rotlicht-Modus lesbar.

---

## Stufe J.2: Wissens-Momente 💡  *(kontextuelles Lernen)*

**Ziel:** Wissen erscheint dort, wo es gebraucht wird — nicht als Lehrbuch.

**Mechanik:**
- Wiederverwendbare Komponente „Wissens-Moment“: kleines 💡-Icon an einem
  UI-Element; Tipp öffnet eine kompakte Karte (2–4 Sätze, destilliert aus dem
  Kompendium) mit Link „Mehr im Kompendium →“ (Anker in Lernen-Tab).
- **Automatik genau einmal:** Beim allerersten Kontakt mit einem Feature
  (z. B. erster Archetyp-Picker) klappt die Karte von selbst auf;
  `localStorage["hint-<schlüssel>"]` merkt das. Danach nur noch per 💡.
- Umsetzung als Helfer in neuem `frontend/js/wissen.js`
  (`wissen.attach(el, schlüssel)`), Inhalte als Konstante ebenda.

**Pflicht-Platzierungen** (Schlüssel → Ort):
`schatten` → Archetyp-Picker bei Auswahl „Schatten“ · `archetypen` →
Archetyp-Picker-Kopf · `amplifikation` → Symbolseite-Eingabe ·
`kompensation` → Reflexions-Overlay bei der Kompensationsfrage ·
`grosser-traum` → ⭐-Toggle im Formular · `imagination` → „Weiterträumen“-Overlay ·
`mandala` → J.4-Ansicht · `synchronizitaet` → J.6-Formular.

**Akzeptanz:** Erstkontakt öffnet automatisch, danach nur auf Tipp;
Links springen an die richtige Kompendium-Stelle; mobil nicht überlappend.

---

## Stufe J.3: Die Innenwelt-Bühne  *(Flaggschiff 1: das innere Ensemble)*

**Ziel:** Ein Blick auf die eigene Psyche als Bühne: Wer spielt in deinen
Träumen — und in welcher Rolle?

**Ort:** Der Atlas-Tab bekommt eine dritte Ansicht: „🕸️ Netz | 🗺️ Karte | 🌗 Innenwelt“
(Segmented Control wie bei der Karte; neues Modul `frontend/js/innenwelt.js`).

**Darstellung — das Psyche-Mandala (SVG, polare Anordnung, keine Physik):**
- **Zentrum:** Kreis „Selbst“ (⭕, Akzentfarbe) — nicht klickbar, mit 💡 (`mandala`).
- **Innerer Ring:** alle Personen-Tags **mit** Archetyp, gruppiert in
  8 Sektoren (je Archetyp ein Sektor mit Emoji-Beschriftung am Rand).
  Figur = Kreis, Radius wächst mit Vorkommen (Muster atlas.js), Farbe =
  dominante Emotion ihrer Träume (Emotions-Palette aus H3.1; ohne Emotion:
  `--bg-input`).
- **Äußerer Ring:** Personen **ohne** Archetyp — blasser, als Einladung
  („noch ohne Linse“).
- Leerzustand: „Deine Bühne ist noch leer. Gib den Menschen in deinen Träumen
  eine Linse — im Atlas oder hier.“ + Direktzugang zum Archetyp-Picker.

**Interaktion — das Figuren-Dossier:** Tipp auf eine Figur öffnet unter der
Bühne (Muster `atlas.showSeries`):
- Kopf: Name, Archetyp-Badge (änderbar → Picker aus H3.4), Vorkommen,
  dominante Emotionen, „zuletzt geträumt am …“
- **Gesprächsband:** alle Aktiven Imaginationen von Träumen, in denen die
  Figur vorkommt, chronologisch als Zitate — plus Button
  „🔮 Gespräch fortsetzen“: öffnet das H3.5-Overlay, vorbereitet mit
  *„Wende dich {name} zu …“* im Schritt 2, gespeichert am jüngsten Traum
  mit dieser Figur.
- Assoziationen (Symbol-Lexikon H3.3) der Figur, inline erweiterbar.
- Traumliste (Titel/Datum/Luzidität).

**Backend:** `GET /api/innenwelt` → je Personen-Tag: `{tag_id, name, archetype,
count, last_date, emotions: {angst: 3, …}, has_imaginations}`. (Ein Endpunkt,
damit das Frontend nicht n+1 lädt; Dossier-Details über bestehende Endpunkte.)

**Akzeptanz:** Figuren erscheinen im richtigen Sektor; Archetyp-Wechsel
verschiebt live; Dossier zeigt Gespräche + Assoziationen; „Gespräch
fortsetzen“ speichert korrekt; 412-px-tauglich; 401 ohne Token.

---

## Stufe J.4: Das Traum-Mandala  *(Flaggschiff 2: generative Momentaufnahme)*

**Ziel:** Jung malte Mandalas als Momentaufnahme des Selbst. Die App zeichnet
deins — deterministisch aus deinen echten Traumdaten. Kein Zufall ohne Seed:
gleiche Daten ⇒ gleiches Mandala („das bist du, nicht Deko“).

**Backend:** `GET /api/mandala?from=YYYY-MM-DD&to=YYYY-MM-DD` → aggregierte
Zutaten: `{days: N, dreams: [{date, lucidity, big_dream, emotions:[…]}],
top_elements: [{name, kind, count}] (max 12), emotion_totals: {…}}`.

**Frontend (`frontend/js/mandala.js`, Ansicht in der Analyse als Karte
„🌗 Dein Traum-Mandala“ mit Zeitraum-Wahl: letzter Monat / Quartal / Jahr):**
Konstruktion (SVG, viewBox 600×600, Mittelpunkt 300/300):
1. **Zentrum:** Kreis, Füllung = Mischfarbe der zwei häufigsten Emotionen
   (Farbverlauf), Radius ∝ Anteil luzider Träume (min. 24, max. 60) —
   „je bewusster geträumt, desto größer die Mitte“.
2. **Traumring:** ein Punkt je Traum, gleichmäßig im Kreis (Winkel = Position
   im Zeitraum): normale Träume klein (`--text-dim`), luzide gold (`--lucid`),
   ⭐-Träume als 4-zackiger Stern, Punktabstand vom Zentrum leicht variiert
   durch deterministischen Hash aus Datum+Titel-Länge (organisches Flirren).
3. **Elementkranz:** die top_elements als Blütenblätter (Pfad: einfache
   Bézier-Blatt-Form), Länge ∝ count, Farbe nach kind (Palette aus atlas.js),
   Name klein entlang des Blatts (`<textPath>`), 2–12 Blätter, rotationssymmetrisch.
4. **Emotionsband:** äußerer Ring aus Bogensegmenten, Anteile =
   emotion_totals, Farben = Emotions-Palette.
5. **Achtsamkeit statt Kitsch:** dünne Linien, viel Dunkel, dezente Opazität —
   Stil der App. Bei < 5 Träumen im Zeitraum: reduziertes Mandala + Hinweis
   „Noch dünn — dein Mandala wächst mit jedem Traum.“
- **Export:** Button „Als Bild sichern“ — SVG → Canvas → PNG-Download
  (1200×1200), Dateiname `traum-mandala-<zeitraum>.png`. (Das ist die
  „Postkarte aus meiner Traumwelt“ aus der ROADMAP.)
- 💡-Wissens-Moment `mandala` an der Karte.

**Akzeptanz:** Gleicher Zeitraum ⇒ pixelidentisches Mandala (deterministisch);
Zeitraumwechsel ändert es nachvollziehbar; PNG-Export funktioniert; Leerzustand
freundlich; 401 ohne Token.

---

## Stufe J.5: Die Individuationsreise  *(Wissen wird Weg)*

**Ziel:** Ein geführter Langzeit-Pfad durch Jungs Kernideen — jede Station:
kurzes Wissen + eine echte Übung **an den eigenen Träumen**. Kein Quiz, kein
richtig/falsch: eine Reise.

**Datenmodell:**
```python
class JourneyStep(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    station: str = Field(index=True)   # Schlüssel, s. u.
    note: str | None = None            # Abschluss-Notiz des Nutzers
    completed_at: dt.datetime | None = None
```
**API:** `GET /api/journey` (alle Stationen + Status), `POST /api/journey/{station}`
`{note?}` → abschließen. Stationsreihenfolge ist Empfehlung, kein Zwang
(alles jederzeit öffenbar; „empfohlen als Nächstes“ wird markiert).

**Ort:** Lernen-Tab, Karte „🧭 Deine Individuationsreise *(nach C. G. Jung)*“
ganz oben: Fortschrittspfad (6 Punkte mit Verbindungslinie, erledigt = gefüllt).

**Stationen** (Wissen = Verweis aufs Kompendium-Kapitel; Übung = konkret,
App-integriert; „Abschluss“ = was der Nutzer tut, plus optionale Notiz
„Was habe ich bemerkt?“):

| # | Station (Schlüssel) | Übung |
|---|---|---|
| 1 | Ankommen (`landkarte`) | Kompendium-Kap. 1+2 lesen; Übung: einem beliebigen Symbol im Lexikon die erste Assoziation schenken. |
| 2 | Deine Maske (`persona`) | Kap. 4; Übung: Reflexion an einem Traum mit der Persona-Frage: „Wo hast du in diesem Traum eine Rolle gespielt — und für wen?“ (Frage wird dem Reflexions-Pool der Station hinzugefügt.) |
| 3 | Dem Schatten begegnen (`schatten`) | Kap. 5; Übung: einer Traumfigur die Schatten-Linse geben UND 2 Assoziationen zu ihr notieren. Mut-Hinweis: „Wenn keine Figur passt: warte. Der Schatten kommt.“ |
| 4 | Die Gegenstimme (`anima`) | Kap. 6; Übung: eine Aktive Imagination mit einer rätselhaften/faszinierenden Figur führen (H3.5), min. ein Dialog gespeichert. |
| 5 | Die Sprache der Tiefe (`symbole`) | Kap. 3+8; Übung: einen ⭐-Traum markieren (oder einen bestehenden wählen) und die Kompensationsfrage dazu beantworten. |
| 6 | Ganz werden (`selbst`) | Kap. 7+9; Übung: das eigene Traum-Mandala (J.4) über den größten verfügbaren Zeitraum ansehen und die Abschluss-Notiz schreiben: „Was gehört zu mir, das ich vor drei Monaten nicht gesehen hätte?“ Abschluss zeigt: „Die Reise beginnt jetzt von vorn — Individuation ist kein Ziel, sondern eine Richtung.“ |

Die App **prüft die Übungen nicht hart** (Vertrauen statt Kontrolle) — der
Nutzer schließt selbst ab; wo möglich zeigt die Station aber Live-Status
(z. B. „Du hast noch keiner Figur die Schatten-Linse gegeben“) als sanften Wegweiser.

**Akzeptanz:** Fortschritt persistiert; Stationen verlinken korrekt in
Kompendium/Features; Abschluss-Notizen wiederauffindbar (Stationsseite);
Reihenfolge nicht erzwungen; 401 ohne Token.

---

## Stufe J.6: Synchronizitäts-Journal  *(klein, fein)*

**Ziel:** Bedeutsame Koinzidenzen zwischen Traum und Wachleben festhalten.

**Datenmodell:**
```python
class SyncEvent(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    dream_id: int | None = Field(default=None, foreign_key="dream.id")
    date: dt.date
    text: str                     # was im Wachleben geschah
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)
```
**API:** `GET /api/sync-events`, `POST /api/sync-events` `{dream_id?, date, text}`,
`DELETE /api/sync-events/{id}`.

**UI:** Traumkarte: Aktion „🔗 Ist etwas dazu passiert?“ → Mini-Formular
(Datum default heute, Textfeld). Einträge erscheinen an der Traumkarte
(„🔗 3 Tage später: …“) und gesammelt als Abschnitt in der Innenwelt-Ansicht.
💡-Moment `synchronizitaet` mit der ehrlichen Einordnung (Kap. 8/9): Muster
im Auge des Betrachters sind okay — es geht ums Bemerken, nicht ums Beweisen.

**Akzeptanz:** Anlegen/Löschen; Anzeige an Traum + Sammlung; 401 ohne Token.

---

## Reihenfolge & Abschluss

```
J.1 Kompendium → J.2 Wissens-Momente → J.3 Innenwelt-Bühne
    → J.4 Traum-Mandala → J.5 Individuationsreise → J.6 Synchronizität
```
(J.1/J.2 zuerst — alle späteren Stufen hängen ihre 💡-Momente und Anker daran.)

Pro Stufe: verifizieren (Desktop + 412 px + Rotlicht), Testdaten restlos
löschen, `sw.js` bumpen (neue Dateien `wissen.js`, `innenwelt.js`, `mandala.js`
in SHELL), ein Commit. Danach `ROADMAP.md` aktualisieren (Jung-Erlebnis als
eigener Block unter Horizont 3).
