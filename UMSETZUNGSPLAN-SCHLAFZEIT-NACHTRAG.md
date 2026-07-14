# 😴 Nachtrag zum Schlafzeit-Plan: Erklärkarte im Lernen-Reiter

> Eigenständige Mini-Spezifikation — **erst nach Abschluss von
> `UMSETZUNGSPLAN-SCHLAFZEIT.md` umsetzen** (baut auf dessen Begriffen auf).
> Konventionen: `UMSETZUNGSPLAN.md` Teil A (inkl. Tests-Pflicht und Regel 9:
> Texte zweisprachig über `t()`).
>
> **Anlass (Philipp):** Zur Schlafzeit-Erfassung soll eine Erklärung der
> Schlafzeit UND ihrer Darstellung in den Lernen-Reiter.

## Stufe NX.1: Guide-Karte „😴 Schlaf & Träume"

Als Akkordeon bei den bestehenden Klartraum-Guides (`learn.js`, Muster
`learn.guides`), Position direkt nach dem WBTB-Guide (thematische Nähe).

**Inhalt (DE verbindlich, EN sinngemäß professionell übersetzen):**

> **Warum die Schlafzeit zählt:** Traumreiche REM-Phasen werden im Lauf der
> Nacht immer länger — die ergiebigsten Träume liegen in den letzten Stunden
> vor dem Aufwachen. Wer länger schläft, träumt überproportional mehr; wer
> früher aufsteht, schneidet genau die traumreichsten Phasen ab. Ob das bei
> DIR so ist (»Erinnere ich mehr, wenn ich länger schlafe?«), beantwortet
> die App mit deinen eigenen Daten statt mit Lehrbuchwerten.
>
> **So erfasst du sie** (im Traumformular, immer freiwillig):
> 🕐 **Zeiten** — Zubettgehen und Aufwachen im Viertelstunden-Raster, für
> frische Nächte. · 🌫️ **Nur grob** — vier Dauer-Stufen für Nächte, die
> schon eine Weile her sind. · ❓ **Weiß nicht mehr** — eine ehrliche,
> vollwertige Antwort. Besser ehrlich lückenhaft als geraten.
>
> **So liest du die Auswertung:** Die App teilt deine Nächte in **kurz /
> mittel / lang** — nicht nach festen Grenzen, sondern relativ zu deinen
> eigenen Nächten (Drittel-Prinzip: dein kürzestes Drittel ist »kurz«, egal
> ob du generell viel oder wenig schläfst). Grob erfasste Nächte zählen mit
> und werden als »geschätzt« ausgewiesen; ❓-Nächte fließen nie in die
> Rechnung ein. Der Aufriss-Schalter (»kürzer/länger als deine typische
> Nacht«) teilt an deinem Median.
>
> **Ehrlichkeit zum Schluss:** Selbstauskunft ist Beobachtung, keine
> Messung — und eine Korrelation (»lange Nächte = mehr Wörter«) ist noch
> keine Ursache. Aber genau dafür führst du ja ein Tagebuch: um deine
> eigenen Muster zu finden statt fremde zu glauben.

**Einbau:**
1. Guide-Akkordeon wie beschrieben (i18n-Schlüssel `learn.sleepGuide.*`,
   beide Sprachen).
2. **ⓘ-Hilfe** an der Analyse-Karte „😴 Schlaf & Erinnerung"
   (`hilfe.attach`, Schlüssel `schlaf-analyse`): Kurzfassung in drei Sätzen
   (Was: Schlafdauer × Erinnerung aus deinen Nächten · Wie: Drittel-Prinzip,
   geschätzte Nächte gekennzeichnet · Wozu: die eigene „mehr Schlaf = mehr
   Traum?"-Frage beantworten) + Verweis „Mehr im Lernen-Reiter →" (Anker auf
   die Guide-Karte, `id="guide-schlaf"`).
3. **💡-Wissens-Moment** (`wissen.js`, Schlüssel `schlafzeit`) an der
   Schlafzeit-Zeile im Formular — Erstkontakt-Erklärung in zwei Sätzen,
   danach nur auf Abruf (bestehende Mechanik).

**Akzeptanz:**
- [ ] Guide erscheint im Lernen-Reiter (DE + EN), Anker funktioniert
- [ ] ⓘ an der Analyse-Karte öffnet die Kurzfassung, Link springt zum Guide
- [ ] 💡 am Formular erscheint beim Erstkontakt genau einmal
- [ ] 412 px + Rotlicht geprüft; pytest grün; Testdaten entfernt
