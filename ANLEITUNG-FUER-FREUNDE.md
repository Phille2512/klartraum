# 🌙 Klartraum installieren — in 3 Minuten

Klartraum ist ein privates Traumtagebuch zum Klarträumen-Lernen.
Es läuft komplett auf deinem Computer — kostenlos, ohne Konto, ohne Cloud.

## 1. Herunterladen
→ https://github.com/phille2512/klartraum/releases/latest
Lade das Paket für dein System: `Klartraum-mac.zip` / `Klartraum-windows.zip`

## 2. Starten
- **Mac:** Zip entpacken → RECHTSKLICK auf „Klartraum" → „Öffnen" → nochmal
  „Öffnen". (Der Warnhinweis kommt, weil die App nicht bei Apple registriert
  ist — sie ist quelloffen, du kannst den Code auf GitHub lesen.)
- **Windows:** Zip entpacken → Doppelklick auf „Klartraum.exe" → falls
  SmartScreen warnt: „Weitere Informationen" → „Trotzdem ausführen".
- Es öffnet sich ein schwarzes Fenster (das ist der Motor — nicht schließen,
  solange du die App nutzt) und dein Browser mit Klartraum.

## 3. Passwort setzen
Beim ersten Start legst du ein Passwort fest. Es schützt dein Tagebuch vor
anderen Personen in deinem Netzwerk. **Merk es dir** — zurücksetzen geht nur,
indem du die Datei `auth.json` im Klartraum-Ordner löschst.

## 4. Aufs Handy bringen (optional)
Handy ins gleiche WLAN, im schwarzen Fenster steht eine Adresse wie
`http://192.168.1.23:8000` — die am Handy in Chrome öffnen, anmelden,
Menü → „Zum Startbildschirm hinzufügen". Fertig: App-Icon auf dem Handy.
(Funktioniert nur, solange Klartraum auf deinem Computer läuft.)

## 🔐 Wo sind meine Daten — und was ist das Risiko?

**Deine Träume gehören dir — wörtlich.** Alles, was du hier einträgst,
liegt ausschließlich in einer Datei auf DIESEM Gerät
(`~/Klartraum/dreams.db`). Keine Cloud, kein Konto, niemand liest mit.
Die Kehrseite dieser Freiheit: **Geht das Gerät verloren oder kaputt, sind
die Träume weg — es sei denn, du hast ein Backup.** Ein Backup ist eine
Kopie dieser einen Datei oder ein Export (Analyse → Datenexport). Mach das
regelmäßig — dein zukünftiges Ich dankt dir.

**Faustregel: Einmal pro Woche sichern.** Entweder in der App
(Analyse → „JSON exportieren") oder den Ordner `Klartraum` in deinem
Home-Verzeichnis kopieren. Zwei Klicks, nie wieder Herzschmerz.

## Beenden & Deinstallieren
Beenden: das schwarze Fenster schließen. Deinstallieren: App-Datei löschen —
deine Daten bleiben in `~/Klartraum/` (auch löschen, wenn wirklich alles weg soll).

*Privates Hobbyprojekt, Nutzung auf eigene Verantwortung — kein Medizinprodukt,
kein Therapieersatz. Viel Spaß beim Träumen! 🌙*
