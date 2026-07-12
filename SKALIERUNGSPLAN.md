# 🚀 Skalierungsplan: Von Traumader zum App-Store-Produkt

> Strategiedokument (Juli 2026). Kein Umsetzungsplan zum direkten Abarbeiten,
> sondern die Landkarte für den Fall, dass die Idee gut ankommt — mit
> Alternativen, Empfehlung, Kosten und rechtlichem Überblick.
> **Kein Rechtsrat** — vor einem kommerziellen Launch eine Stunde
> Anwalts-/Steuerberatung einplanen (siehe unten, das ist gut investiert).

## Unverhandelbare Prinzipien (die DNA skaliert mit)

1. **Träume bleiben beim Nutzer.** Lokal zuerst; wenn Sync, dann
   Ende-zu-Ende-verschlüsselt. Das ist nicht nur Ethik, sondern (siehe
   Rechtliches) auch die beste Risiko-Minimierung — und das stärkste
   Marketing-Versprechen dieser App.
2. **Kein Tracking, keine Werbung. Nie.**
3. **Wissenschaftlich ehrlich:** keine Heilversprechen (wichtig! s. Rechtliches).

---

## Die zwei Achsen jeder Entscheidung

**Achse 1 — Datenhaltung** (wichtiger als die Hülle!):
- **(a) Nur lokal:** Daten in einer Gerätedatenbank, Backup als Datei/Export.
- **(b) Lokal + E2E-Sync:** Gerät hält die Wahrheit; ein Server synct nur
  verschlüsselte Blobs, die er nicht lesen kann (Schlüssel aus Passphrase).
- **(c) Cloud-Konto klassisch:** Server hält Klartext (wie Multi-User-Plan).
  Für ein öffentliches Produkt mit Traumdaten **nicht empfohlen** — maximale
  rechtliche Last, gebrochenes Privatsphäre-Versprechen.

**Achse 2 — Hülle** (wie kommt die App auf die Geräte): siehe Alternativen.

**Strategische Kern-Investition, die JEDE Alternative braucht:**
Der **Local-First-Core** — die Backend-Logik (heute Python) wandert als
wiederverwendbares JS/TS-Modul ins Frontend, Datenhaltung SQLite **auf dem
Gerät** (Browser: SQLite-WASM/OPFS; Capacitor: natives SQLite-Plugin —
gleiche SQL-Schicht!). Einmal gebaut, läuft derselbe Core in PWA, TWA und
Capacitor. Das ist Stufe 2 aus `docs/VERTEILUNG.md`, jetzt mit klarem Zweck.

---

## Alternative A — „Der schnelle Fuß in der Tür": PWA + TWA (Android)

**Was:** Die Local-First-PWA wird statisch gehostet (GitHub Pages/Cloudflare,
~0 €); für den **Google Play Store** wird sie per **Trusted Web Activity**
verpackt (Werkzeug: PWABuilder/Bubblewrap — im Kern ein signierter
Android-Wrapper um die eigene URL).

- ✅ Geringster Aufwand nach dem Core (~Tage); ein Codestand für Web + Play
  Store; Updates ohne Store-Review (Web-Deploy genügt).
- ✅ Push-Benachrichtigungen auf Android via Web Push möglich.
- ❌ **Kein Apple App Store.** iPhone-Nutzer installieren die PWA nur über
  Safari („Zum Home-Bildschirm") — funktioniert, aber ohne Store-Sichtbarkeit.
- ❌ Abhängig von Browser-Engine-Launen (OPFS-Speicher, iOS-Eigenheiten).

**Geeignet als:** Marktvalidierung mit echtem Store-Listing, bevor mehr Geld
und Zeit fließen.

## Alternative B — „Das richtige Produkt": Capacitor  ⭐ Empfehlung

**Was:** Das bestehende Vanilla-JS-Frontend + Local-First-Core werden in
**Capacitor** (Ionic) verpackt: echte native Apps für **iOS UND Android**,
innen WebView, außen voller Zugriff auf native APIs über Plugins.

- ✅ **~90 % Code-Wiederverwendung** — HTML/CSS/JS bleiben; Design, Traumtakt,
  alles überlebt. Web-Version läuft parallel vom selben Code.
- ✅ Native Fähigkeiten, die der App wirklich fehlen: zuverlässige lokale
  **Benachrichtigungen** (Reality Checks, Abendritual!), natives SQLite
  (robuster als OPFS), Biometrie-Sperre (Face ID/Fingerabdruck für das
  Tagebuch!), Health Connect/HealthKit (Schlafdaten-Import!), Teilen-Ziel,
  Widgets später.
- ✅ Solo-Entwickler-tauglich; riesiges Ökosystem; TypeScript optional
  schrittweise einführbar.
- ⚠️ Aufwand: Core-Portierung (das größte Stück, s. u.) + pro Plattform
  Einrichtung, Store-Prozesse, ein Mac für iOS-Builds (vorhanden ✓).
- ⚠️ WebView-Feeling: mit gutem Motion Design (Traumtakt!) kaum von nativ
  unterscheidbar — Traumader ist inhalts-, nicht gestenlastig; ideal für
  diesen Ansatz.

## Alternative C — „Der Neubau": Flutter (oder React Native)

**Was:** Kompletter Rewrite der Oberfläche in einem nativen
Cross-Platform-Framework; der Local-First-Core müsste in Dart neu entstehen
(oder via FFI eingebunden werden).

- ✅ Bestes natives Gefühl, beste Performance, ein Team-Standard, falls je
  Mitentwickler dazukommen.
- ❌ **Alles neu:** UI, Logik, Charts, SVG-Karten (Atlas/Mandala/Innenwelt
  sind viel handgebautes SVG!), i18n — realistisch mehrere Monate Vollzeit.
- ❌ Web-Version fällt weg oder wird Zweitsystem.

**Geeignet erst,** wenn Traumader nachweislich trägt (zahlende Nutzer,
klare Roadmap) und Capacitor an echte Grenzen stößt. Nicht vorher.

## Vergleich

| | A: PWA+TWA | B: Capacitor ⭐ | C: Flutter |
|---|---|---|---|
| Apple App Store | ❌ | ✅ | ✅ |
| Google Play | ✅ | ✅ | ✅ |
| Code-Wiederverwendung | ~95 % | ~90 % | ~10 % |
| Native Notifications/Biometrie/Health | teilweise (Android) | ✅ | ✅ |
| Aufwand nach Core | Tage | Wochen | Monate |
| Laufende Komplexität | minimal | mittel | hoch |
| Web-Version inklusive | ✅ | ✅ | ❌ |

---

## Der empfohlene Pfad (Stufen mit Ausstiegspunkten)

**SK.0 — Validierung (jetzt, 0 €):** Sicherheitsnetz + offene Pläne
abschließen, Desktop-Release an 3–10 Freunde, 4–8 Wochen Nutzung.
**Kill-Kriterium:** Nutzen die Freunde sie nach einem Monat noch? Wenn nein:
glücklich als Privatprojekt bleiben — auch ein legitimes Ende dieses Plans.

**SK.1 — Local-First-Core (die große Investition, ~4–8 Wochen Modell-Arbeit):**
- Backend-Logik nach TypeScript portieren: ein Paket `core/` mit
  Datenzugriff (SQL identisch!), Stats-/Atlas-/Mandala-Berechnungen,
  Import/Export. Die pytest-Suite wird als Vitest-Suite mitportiert —
  **die Tests sind die Portierungs-Spezifikation.**
- Speicher-Adapter: SQLite-WASM + OPFS (Web) / natives SQLite (Capacitor) —
  gleiche Schnittstelle.
- Datenübernahme: bestehender JSON-Export importiert nahtlos.
- Die FastAPI-Version bleibt als „Selbst-Hoster-Variante" erhalten (Freunde
  von heute verlieren nichts).

**SK.2 — Store-Premiere Android (TWA):** PWA hosten, Play-Listing
(25 $ einmalig), interner Test → offene Beta → Release.
**Messpunkt:** Installationen/Behaltensrate rechtfertigen iOS-Invest?

**SK.3 — Capacitor-Produkt (iOS + Android):** Apple Developer Program
(99 $/Jahr), Capacitor-Shells, native Plugins (Notifications, SQLite,
Biometrie), TestFlight-Beta, Review-Prozesse. Fastlane/GitHub Actions für
Build-Automatisierung. Ab hier ist Traumader ein **Produkt**: Onboarding
polieren, Store-Assets (Screenshots, Texte DE/EN — i18n zahlt sich aus),
Support-Kanal (eigene E-Mail), Versions-/Changelog-Disziplin,
Crash-Reporting nur opt-in und datensparsam (z. B. selbst gehostetes Sentry
oder bewusst gar keins).

**SK.4 — E2E-Sync als erstes „Plus"-Feature:** Kleiner Sync-Dienst
(der Multi-User-FastAPI-Plan liefert das Gerüst, aber: Server speichert nur
**verschlüsselte Blobs** — Schlüssel entsteht aus Nutzer-Passphrase auf dem
Gerät, z. B. libsodium/WebCrypto; Server kann Träume nie lesen; Passphrase
verloren = Daten weg, ehrlich kommunizieren). Infrastruktur: 1 kleiner VPS +
Postgres reicht für zehntausende Nutzer bei diesem Datenvolumen; Backups +
Monitoring wie im Multi-User-Plan.

**SK.5 — Monetarisierung (wenn überhaupt):** Zur DNA passend:
**Einmalkauf** oder „Kern kostenlos, Sync/Traumbuch als Pro-Einmalkauf".
Keine Abos ohne laufende Serverkosten-Rechtfertigung, keine Werbung, kein
Datenverkauf (ohnehin nichts da — E2E). Apple/Google wickeln als Händler
Steuern/Widerruf für In-App-Käufe weitgehend ab — großer Vereinfacher.

---

## ⚖️ Rechtliches (Deutschland/EU — Überblick, kein Rechtsrat)

**Sobald öffentlich (auch kostenlos!):**
- **Impressumspflicht** (§ 5 DDG) und **Datenschutzerklärung** (DSGVO
  Art. 13) — auch für eine Gratis-App im Store Pflicht; die Stores verlangen
  sie ohnehin (Apple „Privacy Nutrition Labels", Google „Data Safety").
  Mit Local-First + kein Tracking ist die Erklärung erfreulich kurz und ehrlich.
- **Gewerbe/Steuern:** Bei Einnahmen Gewerbeanmeldung (formlos, ~30 €);
  anfangs meist **Kleinunternehmerregelung** (§ 19 UStG). Apple/Google treten
  bei App-Verkäufen als Kommissionär auf und führen Verbraucher-USt ab —
  steuerlich deutlich einfacher als eigener Verkauf. Einmalige Beratung
  beim Steuerberater vor dem ersten bezahlten Release.

**Die zwei Traumader-spezifischen Punkte (wichtig!):**
- **Traumdaten sind sensibel.** Trauminhalte können Gesundheit, Sexualität,
  Religion offenbaren — je nach Lesart Art.-9-DSGVO-Kategorien. **Local-First
  und E2E-Sync sind deshalb nicht nur nett, sondern die zentrale rechtliche
  Entlastung:** Was du nie im Klartext verarbeitest, kann dir nicht auf die
  Füße fallen. Bei Variante (c) — Klartext-Cloud — bräuchte es ausdrückliche
  Einwilligung, TOMs, ggf. DSFA: genau der Aufwand, den wir vermeiden.
- **Keine Heilversprechen (MDR-Falle):** Formulierungen wie „behandelt
  Albträume" oder „Therapie gegen …" können die App zum **Medizinprodukt**
  machen (Zweckbestimmung!) — dann drohen MDR-Pflichten. Deshalb konsequent:
  „Tagebuch & Reflexionswerkzeug", „kann unterstützen", IRT als „bekannte
  Selbsthilfe-Technik" mit Quell- und Therapiehinweis. Der bestehende
  Disclaimer bleibt und kommt in die Store-Beschreibung.

**Außerdem auf dem Zettel:**
- **Markenname prüfen:** „Traumader" vor dem Store-Launch im
  DPMA-/EUIPO-Register recherchieren (kostenlos online); bei Ernsthaftigkeit
  Wortmarke anmelden (DE ~300 €).
- **Altersfreigabe:** Inhalte sind harmlos; Traumtagebuch = persönliche
  Daten → realistisch 12+/„Eltern-Guidance"-Einstufung in den Fragebögen.
- **AGB/EULA:** Stores liefern Standard-EULAs; eigene nur bei Sync-Dienst
  sinnvoll (Verfügbarkeit, Passphrase-Verlust-Klausel).
- **Barrierefreiheit:** Der European Accessibility Act greift für
  Kleinstunternehmen nur begrenzt, aber der Accessibility-Pass aus dem
  Backlog ist ohnehin geplant — gute Barrierefreiheit ist auch Store-Kriterium.
- **Open Source vs. Store:** Beides geht (Repo offen, Binaries im Store) —
  Entscheidung bewusst treffen; MIT-Lizenz erlaubt es problemlos.

## Kosten-Überschlag

| Posten | Kosten |
|---|---|
| Google Play | 25 $ einmalig |
| Apple Developer | 99 $/Jahr |
| Sync-VPS + Domain (ab SK.4) | ~5–8 €/Monat |
| Wortmarke DE (optional) | ~300 € einmalig |
| Steuer-/Rechtsberatung initial | ~200–500 € |
| Werkzeuge/Frameworks | 0 € (alles Open Source) |

**Fazit:** Der Weg in die Stores kostet fast kein Geld — er kostet die
Core-Portierung (SK.1). Genau deshalb: erst SK.0-Validierung, dann die eine
große Investition, dann öffnen sich alle Türen (A → B) nacheinander, jede
mit Ausstiegspunkt. Alternative C bleibt bewusst hinter Glas: „Bei Erfolg
einschlagen."
