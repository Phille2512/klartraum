# 🛡️ Das Sicherheitsnetz von Traumader — verständlich erklärt

Diese Seite erklärt, was hinter den Begriffen „Testsuite", „Backups" und
„Betriebs-Robustheit" steckt — ohne Vorwissen vorauszusetzen. Die technische
Kurzfassung für Implementierer steht in `docs/ARCHITEKTUR.md`
(„Betriebs-Wissen"); die ursprüngliche Spezifikation in
`UMSETZUNGSPLAN-SICHERHEITSNETZ.md`. Hier geht es um das **Warum und Wie**.

---

## 1. Warum überhaupt ein Sicherheitsnetz?

Traumader speichert etwas sehr Persönliches — deine Träume — in genau **einer
Datei** auf deinem Rechner (`dreams.db`). Es gibt keine Cloud, kein Backup-
Team, keinen Support. Wenn diese eine Datei kaputtgeht oder ein Programmierfehler
sie beschädigt, sind die Einträge weg.

Gleichzeitig wächst die App: Über 45 Programmier-Schnittstellen (Endpunkte),
mehrere Datenmodelle, ein Frontend mit vielen Tabs. Je mehr Code, desto größer
das Risiko, dass eine Änderung an einer Stelle etwas an einer anderen Stelle
kaputtmacht — ohne dass man es sofort merkt.

**Zwei echte Vorfälle** haben das gezeigt:
- Beim Bearbeiten eines Traums gab es plötzlich einen Server-Fehler (500),
  weil ein neues Datenfeld nicht korrekt behandelt wurde.
- Eine Änderung am Traumatlas hat eine andere Funktion (Filter/Labels)
  kaputt gemacht, ohne dass es auffiel.

Das Sicherheitsnetz besteht aus vier Bausteinen, die genau solche Probleme
verhindern oder wenigstens sofort sichtbar machen:

| Baustein | Beantwortet die Frage |
|---|---|
| **Backups** | „Was, wenn die Datenbank kaputtgeht?" |
| **Testsuite** | „Wie merke ich, dass ich etwas kaputt gemacht habe — *bevor* ich es benutze?" |
| **Aufteilung in Module** | „Wie behalte ich den Überblick, wenn der Code wächst?" |
| **Betriebs-Robustheit** | „Was passiert, wenn trotzdem mal ein Fehler passiert?" |

---

## 2. Backups — die Kopie für den Notfall

### Die einfache Idee

Ein Backup ist einfach eine **Kopie** der Datenbank-Datei, die zu einem
bestimmten Zeitpunkt gemacht wurde. Geht das Original kaputt, hast du noch
die Kopie von gestern (oder letzter Woche).

### Wie es in Traumader konkret funktioniert

- **Wann?** Jedes Mal, wenn der Server startet, prüft die App: „Gibt es
  schon ein Backup von heute?" Falls nein, wird eines erstellt. Das bedeutet:
  öffnest du die App zweimal am selben Tag, entsteht nur *ein* Backup —
  nicht bei jedem Start eines.
- **Wo?** Im Ordner `~/Traumader/backups/`, als Dateien wie
  `dreams-2026-07-13.db`.
- **Wie sicher ist das Kopieren selbst?** Man könnte denken: „Kopieren ist
  doch simpel, `cp altedatei neuedatei`." Das Problem: Während die App läuft,
  könnte gerade jemand in die Datenbank schreiben. Ein stumpfes Kopieren zu
  diesem Zeitpunkt könnte eine beschädigte, halb-geschriebene Kopie erzeugen.
  Deshalb nutzt Traumader die **eingebaute „Online-Backup"-Funktion von
  SQLite** (der Datenbank-Technik, die hier verwendet wird) — die ist extra
  dafür gebaut, auch während laufender Nutzung ein sauberes Abbild zu ziehen.
- **Wie viele Backups sammeln sich an?** Nicht unbegrenzt — sonst wird die
  Festplatte irgendwann voll. Die Regel:
  - die letzten **14 Tage** werden komplett aufbewahrt (ein Backup pro Tag),
  - zusätzlich bleibt von **jedem Monat der ersten 6 Monate** ein einziges
    „Anker"-Backup erhalten (das jeweils älteste des Monats),
  - alles andere wird beim nächsten Start automatisch gelöscht.

  Das ist ein gängiges Muster („Generationen-Backup"): kurzfristig feine
  Auflösung (jeden Tag), langfristig grobe Auflösung (jeden Monat) — so
  wächst der Speicherbedarf nicht endlos, aber du kommst trotzdem noch Monate
  zurück, falls ein Fehler erst spät auffällt.
- **Vor besonders riskanten Änderungen** (wenn sich das Datenbank-Schema
  ändert, z. B. eine neue Spalte dazukommt) macht die App zusätzlich einen
  **Extra-Snapshot**, der nie automatisch gelöscht wird — eine Art
  „Sicherheitskopie kurz vor der Operation".
- **Wo sehe ich das?** Im Lernen-Tab, Karte „🔐 Deine Daten" steht z. B.
  „Letztes automatisches Backup: heute · 14 Stände aufbewahrt". Ist das
  letzte Backup älter als 3 Tage, erscheint eine Warnung.
- **Wie stelle ich ein Backup wieder her?** Server stoppen → gewünschte Datei
  aus `~/Traumader/backups/` nach `~/Traumader/dreams.db` kopieren → Server
  neu starten. (Steht auch in `docs/HANDBUCH.md`, FAQ „Backup?".)

**Code dazu:** `backend/backup.py` — falls du reinschauen willst, das ist
mit Absicht kurz und in kleine, klar benannte Funktionen aufgeteilt
(`create_daily_backup_if_missing`, `_rotate`, `backup_info`, …).

---

## 3. Die Testsuite — automatisierte Kontrolle

### Die einfache Idee

Ein **Test** ist ein kleines Programm, das ein anderes Programm benutzt und
prüft, ob das Ergebnis stimmt. Statt dass *du* jedes Mal per Hand durch die
App klickst, um zu prüfen „geht das Anlegen eines Traums noch?", schreibt man
das einmal als Test auf — und lässt ihn danach in Sekunden immer wieder
laufen.

Ein Beispieltest in Alltagssprache:

> „Lege einen Traum mit dem Titel 'Test' an. Rufe ihn danach wieder ab.
> Prüfe: Steht da wirklich 'Test'?"

Das genau ist `test_create_and_get_dream` in `tests/test_dreams.py` — nur in
Python statt in Worten.

### Warum lohnt sich das?

Weil ein Test, einmal geschrieben, **für immer** läuft. Jedes Mal, wenn du
(oder ich) später etwas am Code änderst, kannst du in wenigen Sekunden alle
Tests laufen lassen und sofort sehen: „Ist noch alles wie erwartet?" Das ist
der Unterschied zwischen *einmal* manuell im Browser durchklicken und
*dauerhaft* automatisch abgesichert sein.

### Wie das bei Traumader konkret aussieht

- **Werkzeug:** `pytest` — ein sehr verbreitetes Python-Werkzeug, das
  Testdateien findet, ausführt und dir grün (✅ bestanden) oder rot
  (❌ fehlgeschlagen) meldet.
- **Ausführen:** `.venv/bin/pytest` im Projektordner. Dauert aktuell knapp
  6 Sekunden für alle 95 Tests.
- **Gliederung:** Eine Testdatei pro Themenbereich in `tests/` — z. B.
  `test_dreams.py` (Träume anlegen/ändern/löschen), `test_stats.py`
  (Statistik-Berechnungen), `test_backup.py` (die Backup-Logik von oben),
  `test_auth.py` (Passwortschutz).

### Das wichtigste Sicherheitsdetail: eine „Fake"-Datenbank für Tests

Das ist der Teil, der am meisten Vertrauen braucht, deshalb ausführlich:

Tests legen ständig Test-Träume an, ändern sie, löschen sie wieder — genau
wie du es beim echten Benutzen tust. Würden die Tests das an deiner
**echten** `dreams.db` tun, würden sie deine echten Traumeinträge
durcheinanderbringen oder löschen!

Deshalb sorgt die Datei `tests/conftest.py` (die „Startkonfiguration" für
alle Tests) dafür, dass Tests **nie** die echte Datenbank sehen:

1. Noch bevor irgendein Stück App-Code geladen wird, setzt `conftest.py`
   eine Umgebungsvariable, die sagt: „Benutze diesen Ordner hier
   (`/tmp/…`) als Datenverzeichnis" — ein frisch angelegter, leerer
   Temp-Ordner, jedes Mal neu.
2. Der App-Code (`paths.py`) liest diese Variable beim Start und richtet
   sich komplett danach — er weiß gar nicht, dass er gerade in einem Test
   läuft, er denkt einfach „das ist mein Datenordner".
3. Vor **jedem einzelnen Test** wird die Datenbank in diesem Temp-Ordner
   nochmal komplett neu und leer aufgesetzt. Das heißt: Test A kann sich
   nicht versehentlich auf Daten verlassen, die Test B angelegt hat — jeder
   Test startet bei null.

Ergebnis: Ich habe nach jedem der vier Test-Durchläufe geprüft, ob sich an
deiner echten `dreams.db` etwas geändert hat (per Prüfsumme, wie ein
digitaler Fingerabdruck der Datei) — sie war jedes Mal exakt identisch.

### Ein echtes Beispiel: der Test hat einen echten Bug gefunden

Das ist keine graue Theorie — genau das ist beim Schreiben der Tests
passiert. Ein Test sollte prüfen, dass die „Weiterträumen"-Funktion
(technisch: `/api/dreams/echoes`) funktioniert. Der Test schlug fehl — mit
einem Fehler, der auf den ersten Blick nichts damit zu tun hatte.

Der Grund: In der Programmierschnittstelle gibt es zwei ähnliche Adressen:
- `/dreams/echoes` (die „Weiterträumen"-Funktion)
- `/dreams/{irgendeine-Zahl}` (ein einzelner Traum, per ID)

Der Code hatte die zweite Regel **vor** der ersten registriert. Der Server
hat deshalb bei einer Anfrage an `/dreams/echoes` das Wort „echoes" als
„ID-Zahl" interpretieren wollen — und ist gescheitert, weil „echoes" eben
keine Zahl ist. Ein Bug, der beim normalen Ausprobieren in der App leicht
untergehen kann (die Funktion wirkt ja meistens so, als würde sie
funktionieren), den ein Test aber sofort und zuverlässig entlarvt.

Der Test hat also nicht nur „funktioniert" — er hat direkt beim ersten Lauf
einen echten, damals aktiven Fehler in der App gefunden. Das ist genau der
Sinn der Übung.

### Was für Arten von Tests gibt es in dieser App?

- **Der normale Weg funktioniert** (z. B. „Traum anlegen klappt")
- **Regressionstests** — Tests, die genau die zwei oben genannten echten
  Vorfälle nachstellen, damit sie nie wieder unbemerkt zurückkommen
- **401-Matrix** — ein einziger Test, der über *alle* geschützten Adressen
  der App läuft und prüft: „Ohne Passwort/Token kommt man wirklich nirgends
  rein"
- **Validierung** — z. B. „Luzidität auf 7 setzen (erlaubt ist 0–4) muss
  abgelehnt werden"
- **Löschkaskaden** — z. B. „Wird ein Traum gelöscht, verschwinden auch die
  zugehörigen Verknüpfungen sauber"
- **Handverifizierte Statistik** — ein winziger, von Hand nachgerechneter
  Datensatz (3 Träume mit bekannten Werten), gegen den die Statistik-Formeln
  geprüft werden

---

## 4. main.py in Module aufgeteilt — Ordnung für den Code selbst

### Die einfache Idee

Stell dir vor, all deine Traumeinträge stünden in **einer** Word-Datei ohne
Kapitel — 1.400 Seiten am Stück. Technisch geht das, aber jede Suche wird
mühsam. Genau das war mit `main.py` passiert: über 1.100 Zeilen Code für
alles — Anmeldung, Träume, Statistik, Karte, Jung-Analyse — in einer Datei.

### Was wurde gemacht

Der Code wurde in **thematische Dateien** aufgeteilt, ganz ähnlich wie du
deine Traumeinträge nach Tags sortierst statt alles in einen Fließtext zu
schreiben:

```
backend/routers/
  auth.py     – Anmeldung
  dreams.py   – Traum-Einträge
  tags.py     – Schlagworte, Kategorien, Archetypen
  cycle.py    – Bucket-List & Abendritual
  stats.py    – Statistik
  atlas.py    – Traumatlas (Netzwerk-Ansicht)
  map.py      – Traumweltkarte
  jung.py     – Reflexionen, Imaginationen, Jung-Analyse
  export.py   – Datenexport
```

**Wichtig:** Dabei wurde *kein einziges Verhalten geändert* — es ist reines
Umsortieren, keine neue Funktion und keine reparierte Logik (die Reparatur
des `echoes`-Bugs von oben war ein separater Schritt). Damit das sicher
ist, wurde diese Aufteilung **erst nach** der Testsuite gemacht: Nach jedem
Verschieben von Code liefen alle 95 Tests erneut — und weil sie exakt
dasselbe Ergebnis lieferten wie vorher, war klar: nichts kaputt gegangen.

Das ist ein allgemeines Prinzip: **Große, riskante Umbauten sind erst dann
gefahrlos, wenn ein Sicherheitsnetz (die Tests) darunter liegt.** Deshalb
steht die Modul-Aufteilung im Plan auch bewusst *nach* der Testsuite.

---

## 5. Betriebs-Robustheit — was passiert, wenn doch mal was schiefgeht

Drei kleine, aber wichtige Bausteine:

- **Saubere Fehlermeldungen:** Passiert im Server ein unerwarteter Fehler,
  bekommt der Browser früher eine hässliche, technische Fehlerseite
  (HTML mit Absturz-Details). Jetzt kommt stattdessen eine kurze, saubere
  Antwort (`{"detail": "internal_error"}`) — der volle technische Fehler
  landet weiterhin im Server-Log, nur eben nicht mehr direkt im Browser.
- **Gesundheits-Check** (`GET /api/health`): eine einzige, sehr einfache
  Adresse, die (ohne Passwort) antwortet „ich laufe, und das ist meine
  aktuelle Version". Nützlich für automatische Start-Skripte oder um schnell
  zu prüfen, ob der Server überhaupt erreichbar ist.
- **Automatische Frontend-Version:** Früher musste man nach *jeder*
  Änderung am Frontend von Hand eine Versionsnummer im Service-Worker
  hochzählen (`traumader-v7` → `v8`) — vergisst man das, sehen Nutzer alte,
  zwischengespeicherte Versionen der App. Jetzt berechnet der Server beim
  Start selbst einen Code aus allen Frontend-Dateien; ändert sich eine
  Datei, ändert sich automatisch der Code, und der Browser lädt von allein
  die neue Version.

---

## 6. Kurzreferenz zum Ausprobieren

```bash
# Testsuite einmalig einrichten (nur beim ersten Mal nötig)
.venv/bin/pip install -r requirements-dev.txt

# Alle Tests laufen lassen
.venv/bin/pytest

# Nur eine bestimmte Datei
.venv/bin/pytest tests/test_backup.py -v

# Health-Check im Browser/Terminal
curl http://localhost:8000/api/health
```

**Wenn du künftig etwas an der App änderst:** Lass danach `pytest` laufen.
Bleibt es grün, hat sich nichts Bekanntes kaputtgemacht. Wird es rot, zeigt
dir die Fehlermeldung genau, welcher der oben beschriebenen Fälle jetzt
nicht mehr stimmt — bevor du (oder ein Freund, dem du die App gibst) das im
echten Betrieb bemerkt hättest.
