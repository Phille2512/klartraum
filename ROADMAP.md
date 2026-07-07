# 🌌 Roadmap: Von der App zur Traumwelt

> **Vision:** Keine App, sondern eine Traumwelt. Ein Ort, an dem Nutzer ihre
> eigene Traumlandschaft kartografieren, ihre Muster erkennen und sich selbst
> erkunden — Nacht für Nacht ein Stück mehr.

**Leitprinzipien**
1. **Privat zuerst.** Träume sind das Intimste, was es gibt. Alles bleibt lokal
   bzw. unter eigener Kontrolle; kein Tracking, keine fremden Server ohne Not.
2. **Kostenlos im Kern.** Alles Wesentliche funktioniert ohne laufende Kosten.
   Bezahltes (KI-Dienste, Hosting) ist immer optional und abschaltbar.
3. **Spielerisch, nicht verspielt.** Spielmechaniken (Karte, Missionen, Level)
   dienen der Selbsterkundung — nie dem Engagement um seiner selbst willen.
4. **Wissenschaftlich verwurzelt.** Features folgen belegten Methoden
   (LaBerge: Traumzeichen, MILD, WBTB, Inkubation; Tholey: mentale Karten,
   Traumfiguren-Dialog) — keine Esoterik als Fakt verkaufen.

**Stand heute (Juli 2026):** Tagebuch (offline-fähig, passwortgeschützt),
Traumkompass mit Mission, Traumatlas (Orte/Personen/Zeichen als Netz),
Beifuß-Experiment, Erinnerungs-Training, WBTB-Rechner, Export, PWA-Basis.

---

## Horizont 1 — Der tägliche Zyklus (Abend → Nacht → Morgen)

*Die App begleitet bisher nur den Morgen. Immersion entsteht, wenn sie den
ganzen Kreislauf trägt.*

- **🌙 Abendritual / Trauminkubation:** Eigener Abend-Modus. Zeigt Fokus-Zeichen,
  letzte Serie, Bucket-List. Kernfrage: *„Was willst du heute Nacht träumen?"* —
  die Absicht wird gespeichert; der Morgen-Eintrag fragt zurück: *„Hat es
  geklappt?"* (Inkubations-Erfolgsquote als neue Metrik.)
- **🏆 Klartraum-Bucket-List:** Ziele für den nächsten Klartraum (fliegen,
  Traumfigur befragen, zum Leuchtturm gehen …). Abends lesen = mitnehmen in den
  Traum; nach Erfolg abhaken. Erledigte Ziele werden Teil der Chronik.
- **🎙️ Sprachnotizen:** Aufnahmeknopf für halbwache Morgenstunden — murmeln
  statt tippen, Aufnahme hängt am Eintrag (lokal gespeichert; Transkription
  später optional).
- **🔴 Rotlicht-Modus:** Gedämpftes Rot-Theme für WBTB-Phasen — melatonin-
  freundlich, hält den Halbschlaf für MILD.
- **🧘 Morgen-Flow:** Geführter Erfassungsmodus: erst 60 Sekunden still
  erinnern (Timer, Bildschirm dunkel), dann schreiben. Reihenfolge nach
  LaBerge: rückwärts durch den Traum.

## Horizont 2 — Die Traumwelt (das große Ding)

*Der Atlas wird zur begehbaren Welt. Ziel: Wiedererkennen im Traum auslösen
(Tholey: mentale Karten stärken Luzidität und Traumkontinuität).*

- **🗺️ Begehbare Traumweltkarte:** Nutzer platzieren ihre Orte selbst auf einer
  Leinwand (Fantasy-Weltkarten-Gefühl) und ziehen Wege: *„Vom Marktplatz kam
  ich zweimal ans Meer."* Die Karte wächst über Monate zur persönlichen
  Geographie. Einstieg für gezielten Traum-Wiedereintritt: „Heute Nacht gehe
  ich zum Leuchtturm."
- **🌫️ Nebel des Unerforschten:** Unkartierte Bereiche liegen im Nebel; neue
  Orte lichten ihn. Erkunden fühlt sich an wie Entdecken — weil es das ist.
- **📜 Orts-Steckbriefe:** Jeder Ort bekommt eine Seite: Stimmung, Details,
  verlinkte Träume, dominante Emotionen. („Das Elternhaus: 5 Träume, meist
  ängstlich, oft mit Opa.")
- **👤 Traumfiguren-Lexikon:** Personen bekommen Profile: Verhalten, Zitate,
  Begegnungshistorie. Plus Tholey-Werkzeug: *eine Frage vormerken*, die man der
  Figur im nächsten Klartraum stellen will.
- **📖 Chroniken:** Traumserien werden als fortlaufende „Kapitel" erzählt —
  die eigene Traumwelt bekommt eine Geschichte. Nutzer taufen ihre Welt
  mit einem Namen.

## Horizont 3 — Selbsterkenntnis (verstehen, nicht nur sammeln)

- **💛 Emotionen als Dimension:** 1–2 Gefühle pro Traum (Angst, Staunen,
  Freude, Scham …). Schaltet frei: emotionale Landkarte, Gefühl↔Ort- und
  Gefühl↔Person-Muster, Emotions-Trends über Zeit.
- **🪞 Reflexionsfragen:** Statt fertiger Deutung: gute Fragen (Gestalt-Ansatz).
  *„Welches Element des Traums bist du? Was würde es sagen?"* — als optionaler
  Reflexionsschritt nach dem Eintragen, Antworten landen bei den Notizen.
- **🔁 Traum-Echos:** Beim Schreiben zeigt die App ähnliche alte Träume
  („Erinnert an deinen Traum vom 3. Mai"). Lokale Textähnlichkeit, keine Cloud.
- **📊 Korrelations-Dashboard:** Schlafqualität × Luzidität, Beifuß × Erinnerung,
  Wochentag-Muster, Inkubations-Erfolg — die Daten sind schon da.
- **🎄 Jahresringe:** Rückblick „Dein Traumjahr": Wie sind Themen, Orte und
  Emotionen gewandert? Was ist verschwunden, was neu?

## Horizont 4 — Fundament & Öffnung

- **🔐 HTTPS im Heimnetz (mkcert):** Schaltet die volle PWA am Pixel frei
  (Installation, Offline-Start, Benachrichtigungen). Nächster technischer Schritt.
- **☁️ Cloud-Hosting (optional):** Zugriff von unterwegs; Gratis-Tarife zuerst.
- **💾 Automatische Backups:** Zeitgesteuerter Export der Datenbank.
- **👥 Mehrere Nutzer:** Aus „nur für Philipp" wird „jeder erkundet seine
  eigene Traumwelt" — getrennte Welten pro Konto. (Auth-Grundlage existiert;
  Datenmodell braucht dann user-Scoping.) Teilen von Träumen nur als bewusster
  Export („Postkarte aus meiner Traumwelt"), niemals per Default.
- **🤖 KI (optional, zuletzt):** Traumanalyse/Symbolik per Claude API — oder
  **lokal via Ollama** (kostenlos, Träume verlassen den Rechner nie).
  Grundsatz: KI stellt Fragen und findet Muster, sie „deutet" nicht autoritativ.

## Parkplatz / bewusst zurückgestellt

- **✏️ Traumskizzen** (Canvas-Zeichnen pro Traum): Idee dokumentiert, aber
  Philipp ist unsicher, ob es im Alltag trägt. Erst validieren, wenn der
  tägliche Zyklus steht — ggf. als kleines Experiment. *(Stand: 2026-07-07)*
- Wearable-/Schlafphasen-Integration: spannend, aber Hardware-abhängig.

---

## Empfohlene Reihenfolge

1. **Horizont 1** komplett (kleine Bausteine, sofort spürbar täglich) —
   Reihenfolge: Abendritual → Bucket-List → Rotlicht → Sprachnotizen → Morgen-Flow
2. **mkcert/HTTPS** (Pixel wird vollwertig — wichtig, weil Abendritual am Bett stattfindet)
3. **Horizont 2**: Traumweltkarte zuerst als Ausbau des Atlas, dann Steckbriefe → Lexikon → Chroniken
4. **Horizont 3** parallel in kleinen Schritten (Emotionen früh einbauen — je eher, desto mehr Daten)
5. **Horizont 4** nach Bedarf
