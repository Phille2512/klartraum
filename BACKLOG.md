# 💡 Backlog — der Ideentank von Traumader

> **Zweck:** Lebendes Sammelbecken für alles, was angedacht, aber noch nicht
> in einem Umsetzungsplan spezifiziert ist. Neue Ideen landen ZUERST hier —
> nicht direkt in Plänen. Beim Schnüren des nächsten Pakets wird hieraus
> kuratiert. Erledigtes wird gestrichen (nicht gelöscht — durchgestrichen
> mit Datum), Verworfenes wandert in den Abschnitt ganz unten.
>
> **Nicht hier:** Was bereits spezifiziert ist, lebt in den
> `UMSETZUNGSPLAN-*.md`-Dateien (aktuell offen: SICHERHEITSNETZ → HILFE-Rest
> → TRAUMADER → I18N; Vision: `ROADMAP.md`).

---

## ⭐ Herausgehoben: Das Lesezimmer

*(Philipps Wunsch, Juli 2026: „In dieser Nacht" und „Nachtlektüre" gehören
zusammen — eventuell auf eine eigene Seite, sehr harmonisch lesbar.)*

**Idee:** Ein eigener, bewusst stiller Bereich zum **Wiederlesen** — das
Gegenstück zum geschäftigen Analyse-Tab. Kein Diagramm, keine Buttons-Batterie:
**ein Traum pro Bildschirm**, ruhig gesetzt, zum Blättern.

Gestaltungsrichtung (verbindlicher Geist, Details offen):
- Aufgeräumte Lese-Typografie: größere Schrift, großzügiger Zeilenabstand,
  viel dunkler Raum, Badges und Aktionen ausgeblendet (erst auf Tipp).
- **Quellen des Blätterns:** „In dieser Nacht vor einem Monat/Jahr …" ·
  ein Zufallstraum · die nächste Folge einer Traumserie · deine ⭐ großen
  Träume · „zuletzt lange nicht gelesen".
- Abends verlinkt das Abendritual hierher („eine Geschichte aus deiner Welt
  als Nachtlektüre") — Inkubation mit eigenem Material; Rotlicht-tauglich.
- Sanfte Übergänge beim Blättern; am Ende jedes Traums leise Anschlüsse:
  „ähnliche Träume", „Serie fortsetzen".
- Warum es zählt: Wiederlesen ist laut LaBerge selbst ein Erinnerungs-Booster,
  und Muster erkennt man beim Lesen, nicht im Balkendiagramm.

## 🎞️ Herausgehoben: „Traumtakt" — die Bewegungssprache von Traumader

*(Philipps Wunsch, Juli 2026: Navigation schöner, traumartiger, mystischer.
Wird bei Umsetzung ein eigener Umsetzungsplan; hier Konzept + Vokabular.)*

> ✅ **Navigation (Prinzipien 1+2+6) umgesetzt, Juli 2026:** Die Tab-Markierung
> ist jetzt der Traumfaden — ein `.nav-thread`-Element in `index.html`, per
> `moveTraumfaden()` in `app.js` positioniert. Beim Tab-Wechsel gleitet er
> (`transform`/`width`, `--ease-traum`-Bezier, `--dur-drift` 550 ms) statt zu
> springen und leuchtet unterwegs kurz golden auf (`@keyframes
> traumfaden-glow`). `prefers-reduced-motion` schaltet Übergang + Glow ab
> (CSS-Media-Query), Rotlicht-Modus nutzt automatisch seine eigenen Farben
> (CSS-Variablen). Noch offen aus dem Konzept: Prinzip 3 (Tiefe/View
> Transitions), 4 (Atem-Takt für Sternenknopf/Nebel), 5 (Morgens-still-Prüfung),
> weitere Microinteractions-Kandidaten unten.

**Leitidee:** Traumader bewegt sich, wie Träume sich anfühlen — **nichts
schnappt, alles treibt.** Sechs Prinzipien:

1. **Treiben statt Schnappen.** Nur `transform` + `opacity` (ruckelfrei),
   weiche Ease-out-Kurven mit langem Auslauf (eine eigene
   „traumhaft"-Bezier als CSS-Token). Mikro: 150–250 ms · Übergänge:
   400–700 ms · nie länger.
2. **Der Faden führt.** Die Tab-Markierung wird zum **Traumfaden**: Beim
   Wechsel zieht sich eine feine Linie (Akzent → Gold) vom alten zum neuen
   Tab, als würde der Faden weitergesponnen. Das Navigations-Element IST
   die Marke.
3. **Tiefe statt Richtung.** Ansichtswechsel erzählen „tiefer tauchen":
   Richtung Atlas/Innenwelt sinkt die alte Ansicht minimal ab und die neue
   steigt leicht skaliert aus dem Dunkel auf („eintauchen"); zurück zum
   Tagebuch = „auftauchen". Umsetzung: **View Transitions API**
   (`document.startViewTransition`) mit CSS-Fallback — kein Framework nötig.
4. **Atem als Metrum.** Alles, was dauerhaft pulsiert (Sternenknopf,
   Leerzustände, Nebel der Weltkarte), atmet im ~4-Sekunden-Takt — ruhig
   wie Schlaf, nie blinkend.
5. **Morgens still.** Auf dem 30-Sekunden-Kernpfad (öffnen → Traum eintragen)
   sind Animationen minimal bis null — Immersion darf nie bremsen, schon gar
   nicht im Halbschlaf.
6. **Respekt.** `prefers-reduced-motion` schaltet alles ab (Pflicht);
   Rotlicht-Modus dämpft zusätzlich (keine Pulse nachts).

**Microinteractions-Kandidaten:** Speichern → der Eintrag „legt sich" sanft
in die Liste; ⭐-Stern funkelt einmal kurz beim Setzen; Emotions-Chips
antworten mit weichem Aufleuchten; neue Atlas-Knoten „keimen" (Scale 0→1 mit
Überschwingen); Zeitraffer-Elemente tauchen aus Nebel auf; Toast gleitet wie
eine Feder ein.

**Choreographie-Regeln (Design-System-Ebene):** zentrale CSS-Tokens
(`--dur-touch`, `--dur-drift`, `--dur-breath`, `--ease-traum`); Listen
erscheinen gestaffelt (40 ms Versatz, max. 6 Elemente); pro Ansicht bewegt
sich immer nur EINE Sache auffällig — Träume sind seltsam, nicht hektisch.

**Begriffs-Kompass** (fürs Weiterlernen und für Prompts an Modelle):
- *Motion Design* — Oberbegriff: Gestaltung von Animation & Übergängen in UIs
- *UI Animation* — Animationen innerhalb einer Oberfläche
- *Microinteractions* — kleine, kontextbezogene Reaktionen auf Nutzeraktionen
- *Screen/Page Transitions* — Übergänge zwischen Ansichten
- *Interaction Design (IxD)* — Gestaltung des gesamten Interaktionsablaufs
- *Animation Choreography* — Abstimmung mehrerer Animationen zu einem
  konsistenten Ablauf (Design-System-Denken)

## 🌙 Erfassen & Alltag

- **🌀 Phänomen-Tracking:** falsches Erwachen, Schlafparalyse, Traum-im-Traum,
  wiederkehrender Traum, Albtraum — als Checkbox-Reihe (Beifuß-Muster) +
  eigene Auswertung mit Trainings-Hinweisen („4 falsche Erwachen → Reality
  Check direkt nach jedem Aufwachen"). *Größter fachlicher blinder Fleck.*
- **⚡ Zweistufiges Formular (30-Sekunden-Kern):** erst nur Text + Speichern,
  alle Details optional aufklappbar danach. Der meistgenutzte Weg der App
  verdient die meiste Politur.
- **🏠 „Heute"-Ansicht:** optionale Empfangs-Ansicht, die sich der Tageszeit
  anpasst (morgens: großer Erfassen-Knopf + Absichts-Rückfrage; abends:
  Ritual-Einstieg). Philipp war unentschieden — erst nach längerer Nutzung
  wieder anschauen.
- **⏰ Streak-Nachtrag:** sanfter Hinweis, wenn gestern kein Eintrag war
  („Auch ‚keine Erinnerung' zählt — nachtragen?").
- **🛡️ Albtraum-Umschreiben (IRT):** Nach einem Albtraum bietet die App an,
  **ein anderes Ende zu schreiben** — Imagery Rehearsal Therapy (nach Barry
  Krakow), die am besten belegte Selbsthilfe-Technik gegen wiederkehrende
  Albträume. Das neue Ende wird am Traum gespeichert und abends im Ritual
  kurz „eingeübt". Braucht nur: Textfeld am Traum + Abend-Einblendung;
  setzt sinnvollerweise das Phänomen-Tracking (Albtraum-Flag) voraus.
  Haltung: Werkzeug, kein Therapieersatz — Hinweis dazu.
- **🌟 Zeichen-Drill im Abendritual:** Vor dem Schlafen drei eigene
  Traumzeichen als Mini-Erinnerungsübung („Welches davon kam diese Woche
  vor?") — trainiert das prospektive Gedächtnis, auf dem MILD beruht, mit
  echtem eigenem Material statt abstrakter Vorsätze.

## 📊 Analyse

- **🔎 Filter-Chips in der Tagebuch-Suche:** nach Tags, Emotionen, ⭐,
  Phänomenen filtern — Suche kann bisher nur Text.
- **😴 Schlafdaten-Import:** CSV aus Schlaftracker/Smartwatch (Schlafdauer,
  Phasen) → Korrelation mit Luzidität/Erinnerung. Data-Science-Spielplatz.
- **📓 Jupyter-Starter-Notebook** im Repo: lädt den CSV-Export, zeigt
  Korrelationen, Zeitreihen, Wortverläufe — Einladung zum Selbst-Forschen.
- **🆕 Wort-Neuheiten:** „Neu in deiner Traumwelt" — Wörter/Elemente, die
  zum ersten Mal auftauchen (lexikalische Frische als Signal).
- **📖 Das Traumbuch (Jahres-Export):** Ein Jahr als gesetztes PDF/ePub —
  Mandala als Cover, Jahresringe als Vorwort, Träume chronologisch,
  ⭐-Träume hervorgehoben. Die wörtliche „Ernte" des
  Füttern-und-ernten-Prinzips, zum Anfassen; auf Wunsch drucken lassen.
  Auch als kuratierter Auszug denkbar (z. B. für ein Therapie- oder
  Freundes-Gespräch) — immer bewusster Export, nie automatisch.

## 🗺️ Traumwelt & Atlas

- **🤖 Serien-Auto-Erkennung:** Beim Speichern erkennt die App Anklänge an
  bestehende Serien („War das wieder das Elternhaus?") und schlägt die
  Verknüpfung vor.
- **👥 Beziehungs-Verlauf:** Wie wandeln sich die Gefühle zu einer Figur über
  Monate? (Trendlinie im Innenwelt-Dossier.)
- **❓ Frage vormerken (Tholey):** an einer Traumfigur eine Frage hinterlegen,
  die man ihr im nächsten Klartraum stellen will; erscheint im Abendritual.

## 🔧 Technik & Fundament

- **♿ Accessibility-Pass:** `aria-label` für alle Emoji-Knöpfe,
  Kontrast-Prüfung (v. a. Rotlicht-Modus), Fokus-Reihenfolge.
- **🎙️ Lokale Transkription** der Sprachnotizen mit whisper.cpp
  (kostenlos, offline) — falls Sprachnotizen sich bewähren.
- **🧹 Vier-Wochen-Review:** Nach einem Monat echter Nutzung jedes Feature
  fragen: „Wurdest du benutzt?" — Unbenutztes einklappen oder entfernen
  (Präzedenzfall: allgemeine Individuationsreise).

## 🚀 Verteilung & fernere Zukunft

- **🔐 HTTPS im Heimnetz** (Tailscale bevorzugt, mkcert als Alternative) →
  volle PWA + Benachrichtigungen am Pixel. Anleitung existiert, Umsetzung offen.
- **💌 Traumkreise / Postkarten:** bewusstes Teilen einzelner Träume als
  exportiertes Bild (Mandala + Text) — nie Live-Zugriff, immer opt-in.
- **🤖 KI-Traumanalyse:** lokal via Ollama (kostenlos, privat) oder Claude
  API — Grundsatz bleibt: KI fragt und findet Muster, sie deutet nicht.
- **🌍 Local-First-PWA** (Stufe 2 aus `docs/VERTEILUNG.md`) und
  **Multi-User** (`~/Desktop/Klartraum App`) — große Ausbauten, je eigener Plan.

## 🅿️ Parkplatz (bewusst zurückgestellt)

- **✏️ Traumskizzen** (Canvas-Zeichnen) — Philipp skeptisch, erst validieren.
- **⌚ Wearable-Integration** (live) — hardwareabhängig; CSV-Import (oben)
  ist der pragmatische erste Schritt.

## ❌ Bewusst verworfen (nicht wieder vorschlagen ohne neuen Grund)

- **Fragmente-Inbox / Share-Target** — von Philipp aussortiert (Juli 2026).
- **Google-Drive-Backup** — OAuth-Aufwand, Träume gehören nicht zu Google.
- **Tauri/Electron** — Python-Backend; Rewrite lohnt erst für Local-First-PWA.
- **Statische Intro-Startseite** — stört den Morgen-Kernweg; stattdessen
  Sternenknopf/Traumfaden (umgesetzt in Plan HILFE H.4).
- **Allgemeine Individuationsreise im Lernen-Tab** — entfernt zugunsten der
  Traumebenen-Variante (Plan TRAUMADER T.2).
