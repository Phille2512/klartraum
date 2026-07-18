# 🔗 Umsetzungsplan „Verbindungen": Co-Occurrence verstehen — von simpel zu tief

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Konventionen — Tests Pflicht,
> alle UI-Texte zweisprachig über `t()`, Verifikation im Browser inkl.
> Rotlicht + 412 px). Dieser Plan **ersetzt Stufe E.1** aus
> `UMSETZUNGSPLAN-ERKENNTNISSE.md` (dort steht jetzt ein Verweis hierher).
>
> **Anlass (Philipp, Juli 2026):** Verbindungen zwischen Merkmalen (Orte,
> Personen, Zeichen, Emotionen) sollen so dargestellt werden, dass der
> Nutzer **intuitiv Wissen daraus zieht** — ohne Statistik-Vorwissen.
>
> **Didaktisches Leitprinzip (verbindlich): die Verstehens-Treppe.**
> 1. **Satz vor Chart.** Jede Darstellung wird von einem deutschen Satz
>    angeführt („Wenn Mutter im Traum ist, ist Angst dabei — in 7 von 11
>    Fällen"); die Grafik ist der Beleg darunter, nie umgekehrt.
> 2. **Von simpel zu komplex, Stufe für Stufe:** Lesen (V.1 Paar-Sätze) →
>    Muster sehen (V.2 Heatmap) → Erkunden (V.3 Atlas-Kanten) →
>    Vertiefen (V.4 Element-Steckbrief). Jede Stufe ist allein
>    wertstiftend; keine setzt die nächste voraus.
> 3. **Zahlen in Alltagssprache:** „x von y Fällen" statt Lift/Jaccard/
>    p-Werten. Die Statistik arbeitet unsichtbar im Hintergrund
>    (Ranking, Wächter) — erklärt in ⓘ-Hilfe und 💡-Wissens-Momenten.
> 4. **Keine Zufallsbefunde:** Paare erscheinen nur, wenn sie den
>    Signifikanz-Wächter (V.1) passieren. Lieber leer als beliebig.
>
> **Querverbindungen:** E.2 (`nBadge`) vorher umsetzen. V.5 registriert
> einen Generator in der D.3-Engine (`UMSETZUNGSPLAN-DASHBOARD.md`).
> V.4 verwertet später die Figuren-Valenz aus E.5 (Schlafend-Prinzip:
> Abschnitt erscheint erst, wenn Valenz-Daten existieren).
> **Bewusst verworfen** (Entscheidung Juli 2026, nicht wieder aufmachen
> ohne neuen Anlass): Chord-Diagramm (auf 412 px unlesbar), Sankey
> (suggeriert eine Fluss-Richtung, die Co-Occurrence nicht hat),
> Element×Element-Matrix (wächst quadratisch), Tripel-Analysen (bei
> aktuellem n zu dünn). → Cluster/„Traumthemen" liegt im BACKLOG.

---

## Gemeinsames Fundament: Berechnung & Endpoint

Ein Backend-Baustein trägt alle Stufen — `stats_helpers.py::build_connections()`
+ neuer read-only Endpoint `GET /api/stats/connections?from=&to=`
(geschützter Router; kein Schema-Umbau, alles aus `Dream`/`Tag`/Emotionen).

**Pro Paar (Element×Element und Emotion×Element):**
- `n_together`, `n_a`, `n_b`, `n_dreams` (Elemente: Tags mit
  kind ∈ {dream_sign, place, person}; ein Element zählt pro Traum einmal).
- **Ranking-Metrik: Jaccard** = `n_together / (n_a + n_b − n_together)` —
  robuster als Lift bei seltenen Elementen (Lift überbewertet 2-von-2-Paare).
- **Konditional-Richtung fürs Frontend:** immer vom selteneren Element aus
  formulieren („Wenn <selteneres> …, dann <häufigeres> in x von y Fällen",
  y = Vorkommen des selteneren) — das gibt die stärkste, ehrlichste Aussage.
- **Signifikanz-Wächter: einseitiger Fisher-Exact-Test** (hypergeometrisch,
  mit `math.comb` — keine neue Dependency). Paar wird nur ausgeliefert,
  wenn `p < 0.1` UND `n_together ≥ 3`. Der p-Wert bleibt intern
  (Alltagssprache-Prinzip), wird aber im API-Response mitgegeben
  (Data-Science-freundlich, wie beim CSV-Export).

```json
{
  "element_pairs": [{"a": {"name": "Schule", "kind": "place", "n": 8},
                     "b": {"name": "Mutter", "kind": "person", "n": 11},
                     "together": 5, "jaccard": 0.36, "p": 0.03}],
  "emotion_elements": [{"emotion": "angst",
                        "element": {"name": "Mutter", "kind": "person", "n": 11},
                        "together": 7, "jaccard": 0.41, "p": 0.02}],
  "n_dreams": 87
}
```

**Tests (Pflicht, Fundament zuerst):** Fisher-p gegen bekannte Werte
(z. B. Tea-Tasting-Beispiel und zwei handgerechnete Fälle), Jaccard,
Konditional-Richtung (selteneres Element zuerst), Doppel-Tag im selben
Traum zählt einmal, Wächter-Grenzen (p=0.1, n=2), Zeitraum-Filter, 401.

## Stufe V.1: Paar-Sätze — Lesen  *(simpel)*

Neuer Sektions-Chip **„🔗 Verbindungen"** in `#stats-section-nav`
(Chip-Leiste horizontal scrollbar machen, falls sie auf 412 px umbricht).

- **Darstellung:** Liste der Top-8-Paare (nach Jaccard), jedes als
  **Satz-Karte**: Konditional-Satz in Alltagssprache + dezenter
  „x von y"-Beleg + `nBadge`. Kein Chart in dieser Stufe — der Satz IST
  die Darstellung.
- Emotion×Element-Paare gemischt mit Element×Element in einer Liste
  (die Engine sortiert; der Nutzer denkt nicht in Tabellen-Typen).
- **Tap auf Karte** → Tagebuch-Tab, gefiltert auf Träume mit beiden
  Merkmalen (bestehende Filter-Mechanik wiederverwenden bzw. Übergabe
  an die Listen-Ansicht).
- **Leerzustand:** „Noch keine belastbaren Verbindungen — sie entstehen
  mit jedem Eintrag" (zweisprachig). ⓘ-Hilfe: Was heißt „Verbindung",
  warum erscheinen manche Paare nicht (Zufalls-Schutz, ohne p-Wert-Jargon).
- 💡-Wissens-Moment `connections`: Korrelation ≠ Ursache, kleine n =
  Tendenzen — im Ton der bestehenden Wissens-Momente.

**Tests:** Frontend per Browser-Verifikation (Filter-Sprung, Leerzustand,
DE/EN, Rotlicht); Backend ist durchs Fundament gedeckt.

**Akzeptanz:** Ein Nutzer ohne Statistik-Wissen liest die Sektion wie
kurze Befund-Sätze und kann jeden mit einem Tap am Tagebuch nachprüfen.

## Stufe V.2: Emotions-Heatmap — Muster sehen  *(mittel)*

Unter den Paar-Sätzen in derselben Sektion: **„Wo wohnt welche Emotion?"**

- **Matrix Emotionen (Zeilen, max. 12) × Top-Elemente (Spalten, max. 8
  nach Vorkommen)** — bewusst NUR Emotion×Element: feste, mobile-taugliche
  Größe. Zellwert = Konditional-Anteil (Emotion dabei in x % der
  Element-Träume); Zellton = 4-stufige Abstufung einer Akzentfarben-Skala
  (CSS-Variablen, Rotlicht-tauglich). Zellen unter dem Wächter bleiben
  leer statt blass — Ehrlichkeit vor Vollständigkeit.
- **Umsetzung als CSS-Grid/Tabelle, nicht Chart.js** (Tap-Ziele,
  Textzellen und Theming sind so einfacher; kein Canvas nötig).
- **Tap auf Zelle** → gefilterte Traumliste (wie V.1).
- Zeilen-/Spaltenköpfe mit den bestehenden Emoji der Emotionen bzw.
  Kind-Icons (📍/👤/✨) — Wiedererkennung statt Legende.
- Über der Matrix eine **automatische Bildunterschrift** (Satz-Prinzip!):
  die auffälligste Zelle als Text („Am deutlichsten: Angst wohnt bei
  Mutter — 7 von 11").

**Tests:** Konditional-Anteile und Top-Element-Auswahl backend-seitig
(im Fundament ergänzen: `emotion_matrix`-Block im Response); Browser:
412 px (horizontales Scrollen der Matrix in eigenem Container), Tap-Sprung.

**Akzeptanz:** Die Matrix passt ohne Seiten-Scroll auf den Pixel-Screen
(interner Scroll erlaubt) und die Bildunterschrift benennt immer die
stärkste belastbare Zelle.

## Stufe V.3: Atlas-Kanten — Erkunden  *(mittel, eigener Ort)*

Der Traumatlas (Netz-Ansicht, `atlas.js`) zeigt Verbindungen bereits
räumlich — er bekommt die Co-Occurrence-Stärke dazu. **Kein neues Netz
bauen; das bestehende SVG + Kräfte-Simulation bleibt.**

- `GET /api/atlas` liefert pro automatischer Kante zusätzlich
  `together` (gemeinsame Träume) — nur Kanten, die den Wächter aus dem
  Fundament passieren; manuelle `MapPath`-Kanten bleiben unverändert
  und werden visuell unterschieden (gestrichelt = manuell).
- **Kantenstärke** skaliert mit `together` (3 Stufen reichen: 1–2 / 3–4 /
  5+); Deckkraft statt Farbe variieren (Rotlicht-Modus!).
- **Tap auf Kante** → Bottom-Sheet mit dem Konditional-Satz des Paares +
  Liste der gemeinsamen Träume (Titel + Datum, Tap → Traum).
- Bestehende Filter/Fokus/Zeitraffer-Bedienung (Plan ANALYSE-UX Teil B)
  nicht anfassen — nur die Kanten-Darstellung und das Sheet sind neu.

**Tests:** Kanten-Filterung (Wächter), `together`-Werte im Atlas-Response
(Backend); Browser: Tap-Treffsicherheit auf Kanten (Touch-Ziel ≥ 24 px
via unsichtbarem breiterem Hit-Path), Zeitraffer unbeeinträchtigt.

**Akzeptanz:** Der Atlas fühlt sich unverändert an, aber dicke Kanten
erzählen sofort, welche Beziehungen tragen — und jede Kante beantwortet
auf Tap „wie oft, und in welchen Träumen?".

## Stufe V.4: Element-Steckbrief — Vertiefen  *(komplex, integrativ)*

Die Ego-Sicht: **ein Element, alle seine Beziehungen an einem Ort.**
Erreichbar von überall, wo ein Element auftaucht (Atlas-Knoten,
Symbol-Lexikon, Paar-Karten aus V.1, Heatmap-Spaltenkopf aus V.2).

- **Backend:** `GET /api/elements/{tag_id}/profile` — read-only, bündelt:
  Vorkommen gesamt + Zeitleiste (pro Monat), Top-Begleiter (aus dem
  Fundament, Wächter-gefiltert), Gefühlsprofil (Emotions-Anteile in
  Träumen des Elements), stärkster Konditional-Satz, vorhandene
  `SymbolNote`s, bei Personen: Archetyp.
- **UI als Bottom-Sheet/Overlay** (Muster der bestehenden Overlays), von
  oben nach unten in Treppen-Logik: ① Kopf (Name, Kind-Icon, „11 Träume
  seit März") → ② der eine Satz → ③ Begleiter-Chips (Tap → deren
  Steckbrief — Erkunden durch Hangeln!) → ④ Gefühlsprofil-Balken →
  ⑤ Auftritts-Zeitleiste (Inline-SVG-Sparkline) → ⑥ Symbol-Notizen
  (bestehende Lexikon-Funktion einbetten, nicht duplizieren).
- **Valenz-Verlauf** (nur Personen, nur wenn E.5 umgesetzt UND Valenzen
  erfasst): Punktreihe 😨/😐/😊 chronologisch — bis dahin unsichtbar
  (Schlafend-Prinzip).
- Querverweis „Traum-Echos zu diesem Element" (bestehendes Feature
  verlinken, falls Echos existieren).

**Tests:** Profil-Endpoint (alle Blöcke, leere Blöcke, 404, 401);
Browser: Hangeln über Begleiter-Chips (min. 3 Sprünge), Sheet-Schließen,
Rotlicht, 412 px.

**Akzeptanz:** Von jedem Element-Vorkommen in der App ist der Steckbrief
in ≤ 1 Tap erreichbar; das Hangeln von Element zu Element funktioniert
flüssig und erzeugt den „Traumlandschaft erkunden"-Effekt der Vision.

## Stufe V.5: Neue Verbindungen — die Engine erzählt es  *(klein)*

Generator `new_connection` in der D.3-Engine registrieren: ein Paar, das
den Wächter passiert, dessen gemeinsame Auftritte aber **alle in den
letzten 21 Tagen** liegen, obwohl beide Elemente älter sind →
„Schule und Wasser treten seit kurzem gemeinsam auf — 3× in drei Wochen,
davor nie" (`text_key` + params, zweisprachig; Effekt = together).
Tap → Verbindungen-Sektion, Paar-Karte hervorgehoben.

**Tests:** Fixture mit Alt-Elementen und junger Ko-Okkurrenz (Finding),
Gegenprobe alte Ko-Okkurrenz (kein Finding), Wächter greift auch hier.

---

## Reihenfolge & Abschluss

```
Fundament → V.1 → V.2 → V.3 → V.4 → V.5
(V.5 jederzeit nach V.1 möglich, sobald D.3-Engine existiert)
```

- **Einordnung in die Gesamtreihenfolge:** ersetzt E.1 an dessen Position
  (also vor E.2 beginnen ist ok — das Fundament braucht E.2 nicht;
  V.1-UI verwendet `nBadge`, daher V.1-Frontend nach E.2).
- Nach jeder Stufe: `docs/ARCHITEKTUR.md` (neue Endpoints!) und bei V.3/V.4
  `docs/HANDBUCH.md` nachziehen; neue UI-Texte über `t()`; keine neuen
  JS-Dateien geplant — falls doch, `SHELL`-Liste in `sw.js` ergänzen;
  Testdaten nur als `TEST-…` und restlos löschen.
- **Vier-Wochen-Review:** Wenn V.2 (Heatmap) oder V.3 (Kanten-Sheet) nicht
  genutzt werden, einklappen/entfernen — die Satz-Karten aus V.1 sind der
  unverhandelbare Kern, alles andere muss sich bewähren.
