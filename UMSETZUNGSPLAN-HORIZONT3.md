# 🔬 Umsetzungsplan Horizont 3: Selbsterkenntnis + Jung-Modul

> Eigenständige Spezifikation für einen beliebigen Implementierer (Mensch oder
> KI-Modell). **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Kontext, Konventionen,
> Fallstricke) — alles dort gilt unverändert. Vision: `ROADMAP.md`. UI-Sprache: Deutsch.

## Vorbedingung: Aufräumen

Es liegen ggf. **uncommittete Änderungen** aus Horizont 1/2 vor. Bevor diese
Spezifikation begonnen wird: laufende Stufen fertigstellen, gegen ihre
Akzeptanzkriterien verifizieren und **pro Stufe committen** (Teil C des
ersten Plans). Horizont 3 startet auf sauberem Stand.

## Haltung des Jung-Moduls (verbindlich)

C. G. Jungs Traumpsychologie ist ein **Deutungsrahmen, keine gesicherte
Naturwissenschaft**. Daraus folgt für alle Features dieses Plans:

1. **Die App deutet nie autoritativ.** Sie stellt Fragen, sammelt die
   Assoziationen des Nutzers und zeigt Muster. Formulierungen wie „Das
   bedeutet …“ sind verboten; erlaubt ist „Was verbindest du mit …?“
2. **Kein Traumsymbol-Wörterbuch.** Jung selbst lehnte fixe Symbolbedeutungen
   ab — Symbole sind persönlich. Das Symbol-Lexikon (Stufe 3) wird
   ausschließlich vom Nutzer gefüllt.
3. **Archetypen sind Reflexions-Linsen,** keine Diagnosen. UI-Texte
   entsprechend weich formulieren („könnte“, „Linse“, „Perspektive“).
4. Kurze Herkunftsangaben im UI sind erwünscht (z. B. „nach C. G. Jung“),
   wie beim Traumkompass („nach Stephen LaBerge“).

---

## Stufe H3.1: Emotionen als Dimension  *(Fundament — zuerst!)*

**Ziel:** Jeder Traum bekommt Gefühle. Je früher gebaut, desto mehr Daten
sammeln sich für alle späteren Auswertungen.

**Festes Vokabular** (genau diese 8, als Konstante in Backend und Frontend):
`angst, freude, staunen, trauer, wut, scham, geborgenheit, verwirrung`

**Datenmodell:** Wiederverwendung der Tag-Maschinerie: `Tag.kind == "emotion"`.
Kein Schema-Change nötig. `DreamIn`/`DreamOut` bekommen `emotions: list[str]`
(Backend validiert gegen das Vokabular, 422 bei unbekannten Werten).
**Fallstrick 3 beachten:** `emotions` in `model_dump(exclude={...})` aufnehmen
und in `apply_tags()` als weitere Gruppe verarbeiten. `to_out` ergänzen.

**UI (journal.js / index.html):**
- Im Formular unter Luzidität: Chip-Reihe „Wie hat es sich angefühlt?“ —
  8 antippbare Chips (Mehrfachauswahl, ausgewählt = Akzentfarbe), mit Emoji:
  😨 Angst · 😊 Freude · 🤩 Staunen · 😢 Trauer · 😠 Wut · 😳 Scham ·
  🤗 Geborgenheit · 😵‍💫 Verwirrung
- Traumkarte: Emotions-Emojis als Badges.
- Export (CSV/JSON): Spalte/Feld `emotions` ergänzen.

**Analyse (stats.js + /api/stats):**
- `emotions`: Verteilung gesamt (Balken) + `emotion_lucid`: Klartraum-Quote
  je Emotion (nur Emotionen mit ≥ 3 Träumen zeigen).
- Atlas-Steckbrief/Serienansicht: dominante Emotionen des Elements anzeigen
  („Im Elternhaus meist: 😨 😢“). Dafür `GET /api/atlas` bzw. Serien-Daten
  um Emotions-Zählung je Element erweitern.

**Akzeptanz:** Chips speichern/laden korrekt (auch Bearbeiten); Badges sichtbar;
Verteilung in Analyse; unbekannte Emotion → 422; 401 ohne Token.

---

## Stufe H3.2: Große Träume ⭐ & Reflexionsfragen

**Ziel:** Bedeutsame Träume markieren (Jungs „große Träume“) und nach dem
Eintragen optional geführt reflektieren.

**Datenmodell:**
- Migration: `ALTER TABLE dream ADD COLUMN big_dream INTEGER NOT NULL DEFAULT 0`
- Neue Tabelle:
```python
class Reflection(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    dream_id: int = Field(foreign_key="dream.id", index=True)
    question: str      # die gestellte Frage (Volltext, eingefroren)
    answer: str
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)
```

**Fragen-Pool** (Konstante im Frontend; pro Reflexion 3 zufällig, max. 1 je Quelle):
- Gestalt: „Wähle ein Element des Traums und sprich als es: ‚Ich bin … und ich …‘ — was sagt es?“
- Gestalt: „Was ist das lebendigste Bild des Traums? Was macht es mit dir, wenn du es jetzt ansiehst?“
- Jung (Kompensation): „Träume gleichen oft die Tagessicht aus. Wo könnte dieser Traum eine Einseitigkeit deines Wachlebens ausgleichen?“ *(nach C. G. Jung)*
- Jung (Kontext): „Was ist gestern passiert, das mit diesem Traum sprechen könnte?“
- LaBerge: „Woran hättest du in diesem Traum merken können, dass du träumst?“
- Frei: „Wenn dieser Traum ein Titelbild einer Zeitschrift wäre — welche Schlagzeile stünde darüber?“

**API:** `GET /api/dreams/{id}/reflections`, `POST /api/dreams/{id}/reflections`
`{question, answer}`, `DELETE /api/reflections/{id}`. `DreamIn/Out`: `big_dream: bool`
(Fallstrick 3 gilt NICHT — echtes Modellfeld, nicht ausklammern!).

**UI:**
- Formular: Stern-Toggle „⭐ Großer Traum“ neben dem Beifuß-Haken
  (Tooltip/small: „numinos, aufwühlend, bleibt im Gedächtnis — nach C. G. Jung“).
- Nach dem Speichern eines Traums: Toast mit Aktion „🪞 Reflektieren?“ (oder
  kleine Karte über der Liste, 10 s sichtbar). Klick → Overlay: 3 Fragen
  untereinander, je ein Textfeld, alles optional, „Fertig“ speichert nur
  beantwortete. Auch später erreichbar: Button „🪞 Reflexion“ in der Traumkarte.
- Traumkarte: ⭐ vor dem Titel bei big_dream; vorhandene Reflexionen
  einklappbar unter dem Inhalt (Frage kursiv, Antwort darunter).

**Akzeptanz:** Reflexion anlegen/ansehen/löschen; ⭐ speichert und filtert
nicht kaputt; Fragen rotieren; 401 ohne Token.

---

## Stufe H3.3: Persönliches Symbol-Lexikon  *(Jung: Amplifikation)*

**Ziel:** Wiederkehrende Elemente (Traumzeichen, Orte, Personen) bekommen eine
eigene Seite, auf der der Nutzer über Zeit **eigene Assoziationen** sammelt.

**Datenmodell:**
```python
class SymbolNote(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    tag_id: int = Field(foreign_key="tag.id", index=True)
    text: str
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)
```

**API:** `GET /api/tags/{id}/notes`, `POST /api/tags/{id}/notes` `{text}`,
`DELETE /api/symbol-notes/{id}`. Nur für kinds `dream_sign|place|person`.

**UI — die „Symbolseite“:** Erweiterung der bestehenden Serien-Ansicht
(`atlas.showSeries` und künftige Steckbriefe): oberhalb der Traumliste ein
Abschnitt **„Deine Assoziationen“**:
- Liste bisheriger Notizen (Datum + Text, löschbar)
- Eingabefeld mit rotierendem Amplifikations-Impuls als Platzhalter
  (Konstante, z. B.): „Was verbindest du persönlich mit …?“ ·
  „Was war … für dich als Kind?“ · „Wo ist dir … zuletzt im Wachleben
  begegnet?“ · „Welche Redewendung fällt dir zu … ein?“
- Kleiner Hinweis: *„Amplifikation nach C. G. Jung: Das Symbol gehört dir —
  sammle, was es in dir anstößt. Es gibt keine falsche Antwort.“*

**Akzeptanz:** Notizen anlegen/löschen von Netz-Ansicht und (falls vorhanden)
Kartensteckbrief aus; bleiben beim Element über alle Träume hinweg; 401 ohne Token.

---

## Stufe H3.4: Archetypen für Traumfiguren + Schatten-Impuls  *(Jung)*

**Ziel:** Personen-Tags können einer Archetyp-Linse zugeordnet werden —
gleiches Interaktionsmuster wie die Kompass-Kategorien der Traumzeichen.

**Archetypen-Set** (Konstante, Backend validiert):
`schatten, anima_animus, weiser, kind, trickster, held, grosse_mutter, persona`

| Schlüssel | Label | Kurzbeschreibung (UI) |
|---|---|---|
| schatten | 🌑 Der Schatten | verkörpert, was du an dir ablehnst oder nicht siehst |
| anima_animus | 🌗 Anima/Animus | die innere Gegenstimme, oft gegengeschlechtlich |
| weiser | 🧙 Der/die Weise | Rat, Führung, Wissen |
| kind | 🧒 Das Kind | Anfang, Spiel, Verletzlichkeit, Potenzial |
| trickster | 🃏 Der Trickster | bricht Regeln, stört, bringt Wandel |
| held | ⚔️ Held/in | stellt sich, kämpft, überwindet |
| grosse_mutter | 🌳 Große Mutter | nährt, hält, verschlingt |
| persona | 🎭 Persona | die gesellschaftliche Maske |

**Datenmodell:** Migration: `ALTER TABLE tag ADD COLUMN archetype VARCHAR`
(nur für `kind == "person"` gepflegt — analog zu `category` bei Traumzeichen).

**API:** `PUT /api/tags/{id}/archetype` `{archetype: str | null}` — 400 wenn
`kind != "person"`, 422 bei unbekanntem Wert. `GET /api/tags` liefert das Feld mit.

**UI:**
- **Zuordnung:** In der Serien-/Symbolseite einer Person: Zeile „Welche Linse
  passt am ehesten?“ mit Archetyp-Picker (Muster: `stats.openPicker` des
  Kompass — Grid aus Buttons mit Icon, Label, Kurzbeschreibung; plus „Keine“).
  Zuordnung jederzeit änderbar; small-Hinweis „Reflexions-Linse nach C. G. Jung,
  keine Diagnose“.
- **Analyse:** Karte „🌗 Deine inneren Figuren *(nach C. G. Jung)*“ —
  Verteilung der Archetypen über Personen-Vorkommen (Balken, Muster
  Traumzeichen-Chart). Darunter der **Schatten-Impuls**: Wenn eine
  Schatten-Figur in den letzten 14 Tagen vorkam, zeige:
  *„🌑 ‚{name}‘ war wieder da. Wenn du magst: Was an dieser Figur könnte ein
  abgelehnter Teil von dir sein? → Assoziation notieren“* (Link zur Symbolseite).
- **Atlas-Netz:** Personen-Knoten mit Archetyp bekommen das Archetyp-Emoji
  im Label (z. B. „🌑 chef (3×)“).

**Akzeptanz:** Zuordnen/Ändern/Entfernen wirkt sofort in Netz + Analyse;
Nicht-Personen → 400; Verteilung zählt Vorkommen (nicht Tags); 401 ohne Token.

---

## Stufe H3.5: Aktive Imagination  *(Jung: den Traum wach weiterführen)*

**Ziel:** Einen Traum im Wachzustand bewusst weiterträumen und den inneren
Dialog festhalten — Jungs Kerntechnik, ideale Brücke zum Klarträumen
(Tholey: Traumfiguren befragen).

**Datenmodell:**
```python
class Imagination(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    dream_id: int = Field(foreign_key="dream.id", index=True)
    text: str
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)
```

**API:** `GET /api/dreams/{id}/imaginations`, `POST /api/dreams/{id}/imaginations`
`{text}`, `DELETE /api/imaginations/{id}`.

**UI:** Button „🔮 Weiterträumen“ in der Traumkarte → Overlay in drei Schritten
(kein Zwang, „Weiter“-Buttons):
1. *Ankommen:* „Schließe kurz die Augen. Hol die lebendigste Szene des Traums
   zurück. Lass sie da sein, ohne sie zu ändern.“ (30-s-Ring, überspringbar —
   Muster Morgen-Flow, falls vorhanden)
2. *Begegnen:* „Wende dich einer Figur oder einem Ding zu. Stelle eine Frage —
   und lass die Antwort kommen, ohne sie zu erfinden.“
3. *Festhalten:* Großes Textfeld („Schreibe den Dialog oder was geschah …“) →
   Speichern.
Gespeicherte Imaginationen erscheinen einklappbar in der Traumkarte
(Abschnitt „🔮 Aktive Imagination“, Datum + Text, löschbar).
Rotlicht-Modus muss im Overlay greifen.

**Akzeptanz:** Anlegen/ansehen/löschen; mehrere Imaginationen pro Traum möglich;
Overlay mobil bedienbar (412 px); 401 ohne Token.

---

## Stufe H3.6: Traum-Echos  *(lokale Ähnlichkeit, keine Cloud)*

**Ziel:** „Dieser Traum erinnert an …“ — Verbindungen entdecken, die man
selbst nicht sieht.

**Backend:** `GET /api/dreams/{id}/similar` → Top 3 ähnliche Träume
`[{id, title, date, score}]`, `score` 0..1, nur Treffer mit score ≥ 0.15.
Verfahren (bewusst einfach, reine Stdlib):
- Text = title + content + alle Tag-Namen; lowercase, Satzzeichen raus,
  Wörter < 3 Zeichen raus, kleine deutsche Stoppwortliste (Konstante,
  ~40 Wörter: der, die, das, und, ich, war, ein, …).
- Gewichtung: Tag-Namen zählen doppelt (sie sind kuratierte Signale).
- Ähnlichkeit: Kosinus über Termfrequenz-Vektoren (dict-basiert, kein numpy).

**UI:** In der Traumkarte unten ein dezenter einklappbarer Abschnitt
„🔁 Ähnliche Träume“ (lazy: erst beim Aufklappen fetchen). Klick auf einen
Treffer scrollt zum Traum in der Liste (falls geladen) oder setzt die Suche
auf dessen Titel.

**Akzeptanz:** Zwei inhaltlich ähnliche Testträume finden einander; ein
unähnlicher erscheint nicht; Antwortzeit < 1 s bei 500 Träumen (mit
Skript-generierten Testdaten prüfen, danach löschen); 401 ohne Token.

---

## Stufe H3.7: Korrelations-Dashboard

**Ziel:** Zusammenhänge sichtbar machen — ehrlich bei kleiner Stichprobe.

**Backend:** `GET /api/stats` erweitern um `correlations`:
- `sleep_lucidity`: Klartraum-Quote je Schlafqualität (1–5)
- `weekday`: Einträge + Klartraum-Quote je Wochentag
- `emotion_lucid`: aus H3.1 (falls dort noch nicht geliefert)
- vorhandene `beifuss`- und `incubation`-Blöcke hier mit einsortieren/verlinken
- Jede Gruppe nur mit `n`; Quoten für Gruppen mit n < 3 als `null`.

**UI:** Analyse-Karte „🔬 Zusammenhänge“: kompakte Balkenzeilen
(„Schlafqualität 4–5: ✨ 33 % Klartraum-Quote (n=12)“). Gruppen mit zu wenig
Daten ausgrauen: „noch zu wenig Daten“. Fußnote: *„Korrelation ≠ Kausalität —
du kennst das. 😉“*

**Akzeptanz:** Zahlen stimmen gegen manuell nachgerechnete Testdaten;
n<3-Gruppen zeigen keine Quote; 401 ohne Token.

---

## Stufe H3.8: Jahresringe  *(Rückblick)*

**Ziel:** „Dein Traumjahr“: Wie wandern Themen, Orte, Gefühle, Figuren?

**Backend:** `GET /api/review?year=YYYY` →
```json
{
  "year": 2026, "total": 87, "lucid": 9, "big_dreams": [{"id","title","date"}],
  "quarters": [{"q":1,"total":20,"lucid":2,
    "top_signs":[…],"top_places":[…],"top_persons":[…],"top_emotions":[…]}],
  "new_elements": [{"name","kind","first_date"}],
  "gone_elements": [{"name","kind","last_date"}]
}
```
(`new_elements`: erstes Auftreten im Jahr; `gone_elements`: zuletzt vor > 6
Monaten gesehen, davor ≥ 3 Vorkommen.)

**UI:** In der Analyse unten Karte „🎄 Jahresringe“ mit Jahres-Wahl
(nur Jahre mit Einträgen): 4 Quartals-Spalten (mobil: untereinander) mit
Top-Elementen, ⭐-Träume als Zeitleiste, darunter „Neu in deiner Traumwelt“ /
„Verschwunden“. Reine Anzeige, keine Interaktion nötig.

**Akzeptanz:** Rechnet korrekt mit Testdaten über 2 Quartale; leeres Jahr →
freundlicher Leerzustand; 401 ohne Token.

---

## Empfohlene Reihenfolge & Abschluss

```
H3.1 Emotionen  →  H3.2 ⭐/Reflexion  →  H3.3 Symbol-Lexikon  →  H3.4 Archetypen
     →  H3.5 Aktive Imagination  →  H3.6 Echos  →  H3.7 Korrelationen  →  H3.8 Jahresringe
```

Pro Stufe: verifizieren (Desktop + 412 px, Rotlicht-Modus gegenprüfen),
Testdaten restlos löschen, `sw.js`-Cache-Version bumpen (neue Dateien in
SHELL), ein Commit. Danach `ROADMAP.md` aktualisieren.
