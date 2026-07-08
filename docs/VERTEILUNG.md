# 🤝 Verteilungsplan: Die App mit Freunden teilen

*Ziel: Handy + Browser, kein App Store, keine Kosten, minimale Verantwortung —
aber Freunde sollen sie nutzen können.*

> **Entscheidung (Juli 2026), zweistufig:**
> **Stufe 1 — Desktop-Paket (PyInstaller): ✅ UMGESETZT**
> Bestehender Python-Server + Frontend als Doppelklick-App, Daten als echte
> Datei in `~/Klartraum/`, Verteilung über GitHub Releases.
> → Spezifikation: `UMSETZUNGSPLAN-DESKTOP.md`
> **Stufe 2 — Local-First-PWA (Endausbau):** gesamte Logik ins Frontend,
> SQLite-WASM/OPFS im Browser, statisch auf GitHub Pages gehostet (HTTPS →
> volle Handy-PWA per Link). Datensicherheit über `navigator.storage.persist()`
> + automatische Datei-Backups (File System Access API) + Export.
> Tauri/Electron verworfen (Python-Backend, Rewrite lohnt erst für Stufe 2);
> Google-Drive-Backup verworfen (OAuth-Aufwand, Träume ⇏ Google).

> **Kein Rechtsrat.** Grundsatz aber: Je privater der Kreis und je weniger
> fremde Daten du selbst speicherst, desto kleiner deine Verantwortung.
> Rein private Nutzung im Freundeskreis ohne Öffentlichkeit, Werbung oder
> Tracking ist die entspannteste Zone. Öffentlich anbieten (offene URL,
> beliebige Registrierung) wäre eine andere Liga (Impressum, DSGVO & Co.) —
> genau das vermeiden wir hier.

## Die wichtigste Weichenstellung

**Die App ist heute Single-Tenant:** ein Passwort, EIN gemeinsames Tagebuch.
Zwei Freunde auf derselben Instanz sähen gegenseitig ihre Träume. Daraus
folgen zwei grundverschiedene Wege:

|  | Weg 1: Software teilen | Weg 2: Dienst hosten |
|---|---|---|
| Prinzip | Jeder Freund betreibt seine **eigene Instanz** | Du betreibst **einen Server für alle** |
| Code-Änderung | **keine** | Multi-User-Umbau nötig |
| Wessen Daten hältst du? | nur deine | die intimsten Daten deiner Freunde ⚠️ |
| Verantwortung | ≈ null (du teilst Code, keinen Dienst) | Betrieb, Backups, Vertrauen |
| Kosten | 0 € | 0 € möglich (Eigen-Hosting), sonst 💰 |
| Für wen? | Freunde mit etwas Technik-Mut | bequem für alle |

**Empfehlung: Mit Weg 1 starten.** Träume sind das Intimste überhaupt — dass
jeder seine eigenen behält, ist nicht nur bequemer für dich, sondern auch das
bessere Versprechen an die Freunde. Weg 2 später, falls gewünscht.

---

## Weg 1: Software teilen (jetzt umsetzbar)

### V1.1 — Repo veröffentlichbar machen
- GitHub-Repository anlegen (privat mit eingeladenen Freunden oder öffentlich).
  Vorher prüfen: `dreams.db`, `auth.json`, `certs/`, `.venv/` sind git-ignoriert ✓;
  `git log` enthält keine persönlichen Daten ✓ (Testträume wurden nie committet).
- `LICENSE` ergänzen (MIT ist der unkomplizierte Standard) — stellt klar:
  Nutzung auf eigene Gefahr, keine Gewährleistung. Das ist dein
  „wenig Verantwortung“ in Lizenzform.
- Disclaimer aus dem Handbuch (privates Hobbyprojekt, kein Therapieersatz)
  zusätzlich in die README und als Fußzeile in den Lernen-Tab.

### V1.2 — Setup auf „ein Befehl“ bringen
Ein `setup.sh` im Repo:
```bash
#!/bin/sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
echo "Fertig! Starten mit: ./start.sh"
```
und ein `start.sh` (uvicorn-Kommando + IP-Anzeige fürs Handy). README-Abschnitt
„Für Freunde: In 5 Minuten zur eigenen Traumwelt“ (Mac/Linux; Windows-Variante
`setup.bat`). Optional später: Dockerfile für die, die Docker haben.

### V1.3 — Handy & unterwegs ohne mkcert-Gefrickel
Für volle PWA (Installation, Benachrichtigungen) braucht es HTTPS. Statt
mkcert-Zertifikaten auf jedes Handy zu verteilen, ist ein **Tunnel** der
bequemste Gratis-Weg — jeder Freund für seine eigene Instanz:
- **Tailscale** (gratis für Privat): MacBook + Handy ins eigene Tailnet,
  `tailscale serve` gibt der App eine HTTPS-Adresse, die **nur die eigenen
  Geräte** erreichen. Privateste Option, funktioniert auch unterwegs,
  MacBook muss laufen.
- Alternative **Cloudflare Tunnel** (gratis): öffentliche HTTPS-URL —
  dafür URL geheim halten; Passwortschutz existiert ja.
README-Anleitung für beide schreiben; mkcert-Abschnitt als Alternative behalten.

### V1.4 — Erste-Nutzung-Politur (kleine Code-Aufgaben)
- Beim allerersten Start (keine `dreams.db`): freundlicher Willkommens-Leerlauf
  ist schon da — prüfen, dass alle Leerzustände ohne Daten gut aussehen.
- `GET /api/health` für „läuft der Server?“ in start.sh.
- Versionsanzeige (Commit-Hash) im Lernen-Tab-Footer — hilft beim Support
  („welche Version hast du?“).

**Ergebnis Weg 1:** Du schickst Freunden einen Link + „führ setup.sh aus“.
Jeder hat seine private Traumwelt, du trägst keine Datenverantwortung,
Kosten: 0 €.

---

## Weg 2: Eine gehostete Instanz (später, optional)

Nur angehen, wenn Freunde am Selbst-Hosting scheitern und es wirklich wollen.

### V2.1 — Multi-User-Umbau (Spezifikation bei Bedarf ausarbeiten)
- `User`-Tabelle (id, name, password_hash, created_at) + **Einladungscodes**
  (Registrierung nur mit Code → geschlossener Kreis bleibt geschlossen).
- `user_id`-Spalte + Scoping auf ALLEN Tabellen (dream, tag, goal, intention,
  journeystep, syncevent, mapnode, mappath, …) und in JEDER Query —
  aufwändig und fehlerträchtig; eigener Umsetzungsplan mit Tests ist Pflicht
  (eine vergessene WHERE-Klausel = Traum-Leak unter Freunden!).
- Tokens an User binden; Passwort-Reset durch Admin (dich): User-Zeile
  zurücksetzen.

### V2.2 — Hosting ehrlich betrachtet (SQLite braucht eine beständige Platte)
- **Empfohlen, 0 €:** Raspberry Pi / alter Laptop bei dir zu Hause +
  Cloudflare Tunnel oder Tailscale (Freunde ins Tailnet einladen).
  Volle Kontrolle, Daten bleiben physisch bei dir.
- Klassische Gratis-Clouds passen schlecht: ephemere Dateisysteme
  (Datenbank weg beim Neustart), Schlafmodi, Kreditkartenpflicht.
  Wenn Cloud, dann bewusst klein bezahlt — widerspricht aber deinem 0-€-Ziel.

### V2.3 — Betreiberpflichten light
- **Automatische Backups** (täglicher `sqlite3 .backup`-Cron + Kopie auf
  zweites Medium) — bei fremden Träumen nicht verhandelbar.
- Absprache im Freundeskreis statt Paragrafen: „Ich hoste das privat, best
  effort, macht Exporte.“ Der eingebaute Export gibt jedem jederzeit seine
  Daten (das entschärft das Verantwortungsthema erheblich).
- Kreis geschlossen halten: Einladungscodes, keine öffentliche Bewerbung.

---

## Reihenfolge

1. **V1.1 + V1.2** (Repo, Lizenz, Setup-Skripte) — ein Nachmittag
2. **V1.3** (Tailscale/Cloudflare-Anleitung) — dann ist auch DEIN Pixel
   endlich volle PWA, unterwegs inklusive
3. **V1.4** Politur
4. Feedback der ersten Freunde einsammeln
5. Erst dann entscheiden, ob Weg 2 (Multi-User) den Aufwand wert ist
