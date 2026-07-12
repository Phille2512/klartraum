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

## 📊 Analyse

- **🔎 Filter-Chips in der Tagebuch-Suche:** nach Tags, Emotionen, ⭐,
  Phänomenen filtern — Suche kann bisher nur Text.
- **😴 Schlafdaten-Import:** CSV aus Schlaftracker/Smartwatch (Schlafdauer,
  Phasen) → Korrelation mit Luzidität/Erinnerung. Data-Science-Spielplatz.
- **📓 Jupyter-Starter-Notebook** im Repo: lädt den CSV-Export, zeigt
  Korrelationen, Zeitreihen, Wortverläufe — Einladung zum Selbst-Forschen.
- **🆕 Wort-Neuheiten:** „Neu in deiner Traumwelt" — Wörter/Elemente, die
  zum ersten Mal auftauchen (lexikalische Frische als Signal).

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
