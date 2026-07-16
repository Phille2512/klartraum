# ⌚ Umsetzungsplan „Trackerdaten": Schlaftracker anbinden & auswerten

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> Konventionen: `UMSETZUNGSPLAN.md` Teil A (inkl. Tests-Pflicht, Regel 9:
> Texte zweisprachig).
>
> **Voraussetzungen (beide hart):**
> 1. `UMSETZUNGSPLAN-SCHLAFZEIT.md` ist abgeschlossen (die `night`-Tabelle
>    existiert und trägt die manuelle Erfassung).
> 2. **Stufe TD.2 erst umsetzen, wenn echte Export-Dateien vorliegen** —
>    Philipp kauft zunächst einen Tracker (Stand Juli 2026: Xiaomi Smart
>    Band 10) und sammelt ~2 Wochen Daten. Adapter gegen Dokumentation statt
>    gegen echte Dateien zu bauen, produziert erfahrungsgemäß Schrott;
>    die realen Exporte weichen immer ab.
>
> **Anbindungs-Realität (Kontext):** Die Uhr liefert an die Hersteller-App,
> die Daten liegen in der Hersteller-Cloud. V1 dieses Plans nutzt den
> **Datei-Export** (manuell, 100 % lokal). Der Komfort-Weg — **Health
> Connect** auf Android — ist nur nativen Apps zugänglich, nicht Web-Apps:
> Er wird mit der Capacitor-Hülle aus `SKALIERUNGSPLAN.md` (SK.3) möglich
> und ist hier bewusst nur als Ausblick (TD.4) verankert.

**Ehrlichkeits-Grundsatz (zieht sich durch alle Stufen):** Consumer-Tracker
*messen* Bewegung und Puls, die Schlafphasen sind *Schätzungen* (Dauer gut,
REM mäßig). Alle Tracker-Werte werden in der UI als „Tracker-Messung
(Schätzung)" gekennzeichnet; Analysen vergleichen Nächte desselben Trackers
miteinander (Trends), nie absolute Minuten mit Lehrbuchwerten.

---

## Stufe TD.1: Datenmodell — die Nacht lernt Tracker-Vokabeln

`night`-Tabelle erweitern (Migration über `_migrate()`):

```python
source: str = "manual"          # manual | tracker
rem_minutes: int | None = None
deep_minutes: int | None = None
light_minutes: int | None = None
awake_minutes: int | None = None
awakenings: int | None = None    # Anzahl Wachphasen
tracker_score: int | None = None # herstellereigener Schlaf-Score (0-100), optional
```

**Zusammenspiel mit der manuellen Erfassung (verbindliche Regeln):**
- Phasen-Felder kommen NUR vom Tracker (manuell gibt es sie nicht).
- `bed_time`/`wake_time`/`sleep_minutes`: Ein Import überschreibt manuelle
  Werte **niemals stillschweigend**. Import-Option (Auswahl im Dialog):
  „nur leere Nächte füllen" (Default) · „Tracker gewinnt" · „nur Phasen
  ergänzen, Zeiten unangetastet".
- Befüllt der Tracker die Zeiten, gilt `confidence = "exact"`, `source =
  "tracker"`. Manuelle Nachbearbeitung setzt `source` zurück auf `manual`
  (die Phasen bleiben stehen).
- `DreamOut`/Export erhalten die neuen Felder (CSV denormalisiert pro
  Traum-Zeile — Data-Science-freundlich).

**Tests:** Migration, Überschreib-Regeln (alle drei Modi), Export-Spalten.

## Stufe TD.2: Import-Pipeline  *(erst mit echten Dateien!)*

**Backend:** `POST /api/nights/import` (multipart: Datei + `adapter` +
`overwrite_mode`). Antwort: `{imported, updated, skipped, errors: […]}`.
Idempotent: gleicher Import zweimal → zweites Mal alles `skipped`.

**Adapter (jeder eine kleine, getestete Funktion `parse_<adapter>(file) →
list[NightData]`):**
1. `zepp_mi` — Mi Fitness/Zepp-Export (CSV/JSON aus DSGVO-Export bzw.
   App-Export; Format anhand von Philipps echten Dateien fixieren).
2. `fitbit_takeout` — Google-Takeout-Schlaf-JSONs (Struktur ist dokumentiert
   und stabil; Levels: wake/light/deep/rem mit Minuten-Summary).
3. `generic_csv` — Fallback für alles andere: Nutzer ordnet im Dialog die
   Spalten zu (Datum, Bett, Aufwachen, REM-Minuten, …), Zuordnung wird in
   localStorage gemerkt.

**Datums-Zuordnung (wichtigste Fehlerquelle!):** Eine Tracker-Nacht gehört
zum **Datum des Aufwachens** (= Traum-Datum der App). Nächte über
Mitternacht, Nickerchen (< 3 h tagsüber → überspringen und in `skipped`
zählen) und Zeitzonen-Felder explizit testen.

**Frontend:** In der „🔐 Deine Daten"-Karte (Lernen-Tab) ein Abschnitt
„⌚ Tracker-Import": Datei wählen → Adapter (Auto-Erkennung versuchen,
manuell wählbar) → Überschreib-Modus → Import → Ergebnisbericht
(„28 Nächte importiert, 3 aktualisiert, 14 übersprungen"). ⓘ-Hilfe mit dem
Weg zur Export-Datei je Hersteller (kurz, DE/EN).

**Tests:** Fixture-Dateien (anonymisierte echte Exporte!) je Adapter;
Idempotenz; Nickerchen-Filter; kaputte Datei → verständlicher Fehler-Code.

## Stufe TD.3: Analysen — was nur der Tracker beantworten kann

> **Querverbindungen (ergänzt Juli 2026):** Diese Stufe setzt auf
> `UMSETZUNGSPLAN-ERKENNTNISSE.md` auf und nutzt: `nBadge` (E.2),
> Recall-Qualität (E.3), POS/NEG-Emotions-Mapping + Tagesbilanz (E.4),
> Figuren-Valenz (E.5), Klartraum-Details (E.6) und das tracker-freie
> Schlaf-Wirkungs-Paket (E.7) — die E.7-Karten werden hier nur um
> REM-/Wachphasen-Aufrisse vertieft, nicht dupliziert.
>
> **Schlafend-Regel (wie E.6):** Alle Karten und Kennzahlen mit
> Luziditäts-Bezug erscheinen erst, wenn mindestens ein Traum mit
> Luzidität ≥ 3 existiert — vorher kein „0 %"-Lärm.

Alle in der Analyse-Sektion 🔬 Experimente (bzw. bei „😴 Schlaf &
Erinnerung" andocken), ab **≥ 9 Tracker-Nächten**, n immer ausgewiesen:

1. **REM × Traumerinnerung** (die Kernfrage): Verteilung der
   Recall-Qualität (E.3: Fragment/Szene/Film) und Ø Wörter je REM-Terzil
   (wenig/mittel/viel REM — Drittel-Prinzip wie gehabt); Klartraum-Quote
   je REM-Terzil (Schlafend-Regel). **REM-Menge und REM-Dichte trennen:**
   absolute `rem_minutes` und Anteil an `sleep_minutes` als getrennte
   Aufrisse — „lange Nacht" und „REM-reiche Nacht" sind verschiedene
   Effekte, die eine gemeinsame Karte vermischen würde. Zusätzlich
   Aufriss-Option „🌙 REM-Anteil (über/unter deinem Median)".
2. **Wachphasen × Erinnerung:** Nächte mit vielen kurzen Wachphasen gelten
   als erinnerungsfreundlich (man wacht öfter traumnah auf) — stimmt das
   bei dir? Ø Wörter **und Ø Träume/Nacht** je Awakenings-Gruppe
   (0–1 / 2–3 / 4+).
3. **Natürliche WBTB-Nächte** *(Schlafend-Regel)*: Nächte mit ≥ 2
   Wachphasen sind faktisch ungeplante WBTBs — Klartraum-Quote solcher
   Nächte vs. durchgeschlafene. Sobald E.6-Daten existieren, daneben die
   Quote der Träume mit `lucid_trigger = "wbtb"` spiegeln.
4. **Schlafarchitektur × Valenz** (Tracker-Vertiefung von E.7a/E.7b):
   Albtraum-Quote und POS/NEG-Emotions-Anteil je REM-Terzil und
   Awakenings-Gruppe. Dazu **Figuren-Valenz** (E.5): Anteil
   😨-Begegnungen je Schlaf-/REM-Terzil — „häufen sich bedrohliche
   Figuren in kurzen oder REM-armen Nächten?"
5. **Tiefschlaf & Tagesbilanz (Confounder-Karte):** `deep_minutes` neben
   der Tagesbilanz (E.4b) desselben Tages zeigen, bevor man Valenz-Effekte
   dem Schlaf zuschreibt — schlechter Tag und schlechter Schlaf kommen
   selten allein. 💡-Wissens-Moment verlinkt „🌗 Tag & Traum".
6. **Gemessen vs. gefühlt** (der Kalibrier-Spiegel): Wo beides existiert,
   Streudiagramm Selbstauskunft-Minuten vs. Tracker-Minuten + Ø-Abweichung
   („Du schätzt dich im Schnitt 25 min zu kurz"). Charmanter Nebeneffekt:
   macht die eigene 🌫️-Grob-Schätzung über Zeit besser.
7. **Tracker-Score × Erinnerung** (nur wenn `tracker_score` vorhanden):
   einfache Balken je Score-Terzil.
8. 💡-Wissens-Moment `tracker` an diesen Karten: die Ehrlichkeits-Einordnung
   (Phasen = Schätzung; Trends > Absolutwerte; Korrelation ≠ Ursache).

**Tests:** Terzile/Gruppen gegen handgerechneten Fixture-Datensatz;
REM-Menge vs. REM-Dichte getrennt; WBTB-Klassifikation (≥ 2 Wachphasen);
Schlafend-Regel; Mischbestand (manuelle + Tracker-Nächte) verrechnet
sich nicht.

## Stufe TD.4: Ausblick (bewusst NICHT jetzt)

- **Health Connect** (automatisch, täglich, lokal): kommt mit der
  Capacitor-Hülle — Verweis `SKALIERUNGSPLAN.md` SK.3. Die `night`-Tabelle
  aus TD.1 ist dafür bereits das Ziel-Schema; nur die Quelle wechselt.
- **Fitbit Web API** (automatischer Cloud-Abruf): nur erwägen, falls je ein
  Fitbit-Gerät kommt UND der Datei-Weg nervt — OAuth-Registrierung nötig.
- Beides erst nach echter Nutzungserfahrung mit TD.2/TD.3 entscheiden.

---

## Reihenfolge & Abschluss

```
TD.1 Datenmodell → [Tracker kaufen, ~2 Wochen Daten sammeln] → TD.2 Import
   → TD.3 Analysen → (TD.4 später)
```

Pro Stufe: pytest grün, DE + EN, 412 px + Rotlicht, Fixture-/Testdaten
sauber getrennt von Philipps echter DB, ein Commit. Nach TD.3: BACKLOG-
Eintrag „Schlafdaten-Import" als erledigt markieren, `docs/ARCHITEKTUR.md`
(night-Felder, Import-Endpunkt) und `PROJEKT-KOMPASS.md` nachziehen.
