# 🌙 Klartraum — Handbuch

*Für dich (und später deine Freunde): Wie man die App nutzt, um Klarträumen zu
lernen und die eigene Traumwelt zu erkunden.*

## Schnellstart

1. **Server starten** (MacBook):
   ```bash
   cd "/Users/phille/Desktop/Application Klarträumen"
   .venv/bin/uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000
   ```
2. Browser: <http://localhost:8000> — beim ersten Mal Passwort festlegen.
3. **Am Handy** (gleiches WLAN): `http://<MacBook-IP>:8000` öffnen
   (IP: `ipconfig getifaddr en0`), anmelden, über das Chrome-Menü
   „Zum Startbildschirm hinzufügen“.

> ⚠️ Die App läuft nur, solange der Server läuft. Fällt er aus, kannst du
> trotzdem Träume erfassen — sie warten in der Offline-Warteschlange und
> werden automatisch übertragen.

## Der tägliche Rhythmus (das Herz der App)

**Abends — 2 Minuten:**
1. 🌙-Knopf oben: das **Abendritual**. Lies dein Fokus-Zeichen und ein
   Bucket-List-Ziel, formuliere deine **Traumabsicht** („Heute Nacht …“).
2. Optional 🔴 Rotlicht-Modus — schont die Müdigkeit.

**Morgens — 5 Minuten, noch im Bett:**
1. **Bevor du aufstehst:** liegen bleiben, Augen zu, den Traum rückwärts
   durchgehen.
2. „+ Neuer Traum“: erst den Text runterschreiben (auch Fragmente!), dann
   Details: Luzidität, Schlafqualität, Gefühle antippen, 🌿 Beifuß, ⭐ falls
   es ein Großer Traum war.
3. **Traumzeichen, Orte, Personen taggen** — das ist der wichtigste Schritt,
   davon leben Kompass, Atlas und Innenwelt.
4. Die App fragt nach deiner Absicht von gestern: Ja / Nein / Später.

**Tagsüber:** Reality Checks — besonders, wenn dir dein Fokus-Zeichen begegnet.
Die Erinnerung dafür stellst du im Lernen-Tab ein.

## Die Bereiche

### 📓 Tagebuch
Erfassen, Suchen, Bearbeiten. Beim Schreiben zeigt dir „🔁 Ähnliche Träume“
Verbindungen zu früheren Nächten. Nach dem Speichern kannst du **reflektieren**
(3 Fragen) — freiwillig, aber oft der wertvollste Moment.

### 📊 Analyse
- **Kennzahlen & Diagramme:** Klartraum-Quote, Streak, Erinnerungs-Training
  (Ø Wörter — soll steigen!), Traumzeichen-Häufigkeiten.
- **🧭 Traumkompass** *(LaBerge)*: Sortiere deine Traumzeichen in die vier
  Kategorien — daraus entsteht deine tägliche Reality-Check-Mission.
- **🌿 Beifuß-Experiment:** Quote mit vs. ohne. Aussagekräftig ab mehreren
  Nächten in beiden Gruppen.
- **🌗 Traum-Mandala:** Momentaufnahme deiner Traumwelt als Bild — entsteht
  deterministisch aus deinen Daten. Als PNG exportierbar.
- **📤 Export:** JSON/CSV — für eigene Auswertungen und als **Backup**.

### 🗺️ Atlas (drei Ansichten)
- **Netz:** Orte, Personen, Traumzeichen als Knoten — verbunden, wenn sie im
  selben Traum auftauchen. Antippen → Traumserie.
- **Karte:** Lege deine Orte selbst auf die Weltkarte, zieh Wege, sieh den
  Nebel weichen. Ziel: eine mentale Karte, die du im Traum wiedererkennst.
- **Innenwelt** *(Jung)*: Deine Traumfiguren als Bühne um das Selbst. Gib
  Personen eine Archetyp-Linse (Schatten, Trickster …) und führe über die
  Aktive Imagination fortlaufende Gespräche mit ihnen.

### 🎓 Lernen
Klartraum-Guides (Reality Checks, MILD, WBTB), das **Jung-Kompendium**
(9 Kapitel), die **Individuationsreise** (6 Stationen mit Übungen an deinen
echten Träumen), Bucket-List, Reality-Check-Erinnerung, WBTB-Rechner.

## 7 Regeln für den Erfolg

1. **Jeden Morgen schreiben** — auch „keine Erinnerung“ ist ein Eintrag (Streak!).
2. **Fragmente zählen.** Ein Bild, ein Gefühl — rein damit.
3. **Tagge großzügig** Traumzeichen, Orte, Personen — die Analyse macht den Rest.
4. Reality Checks **ernsthaft** machen („Träume ich?“), nicht mechanisch.
5. WBTB an freien Tagen: Wecker per Rechner stellen, 20 min wach, mit
   MILD-Absicht zurück ins Bett.
6. Lies wöchentlich alte Einträge — im Atlas oder als Serie.
7. Geduld: Erste Klarträume kommen oft nach 2–6 Wochen konsequentem Tagebuch.

## FAQ

**Passwort vergessen?** Auf dem MacBook `backend/auth.json` löschen — die App
fragt nach einem neuen Passwort. Träume bleiben erhalten.

**Backup?** Regelmäßig CSV/JSON exportieren (Analyse-Tab) — oder die Datei
`backend/dreams.db` kopieren (Server vorher stoppen).

**Handy zeigt alte Version?** Seite zweimal neu laden (Service-Worker-Update).

**Benachrichtigungen am Handy gehen nicht?** Über `http://<IP>` sind
Browser-Benachrichtigungen und volle PWA-Installation gesperrt — dafür braucht
es HTTPS (siehe README, mkcert bzw. `docs/VERTEILUNG.md`, Cloudflare Tunnel).

**Sind meine Träume privat?** Ja: Sie liegen ausschließlich in
`backend/dreams.db` auf deinem Rechner. Kein Cloud-Dienst, kein Tracking,
keine KI liest mit.

---

*Diese App ist ein privates Hobbyprojekt und Werkzeug zur Selbstreflexion —
kein Medizinprodukt und kein Ersatz für Therapie. Bei belastenden Träumen oder
Schlafproblemen: professionelle Hilfe suchen.*
