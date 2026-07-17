# 🐛 Bugfixes — bekannte Fehler von Traumader

> **Zweck:** Lebendes Sammelbecken für gefundene, aber noch nicht behobene
> Fehler — das Bug-Pendant zu `BACKLOG.md` (dort leben Ideen, hier Defekte).
> Neue Funde landen hier mit Repro-Schritten und Ursache, damit sie sich
> jederzeit unabhängig vom gerade laufenden Umsetzungsplan beheben lassen.
> Behobenes wird nicht gelöscht, sondern mit Datum/Commit abgehakt — so
> bleibt nachvollziehbar, seit wann welche Version wieder sauber ist.

---

## 🔴 Offen

*(aktuell keine)*

---

## ✅ Behoben

### Doppelter Name im selben Traum-Feld lässt „Traum speichern" abstürzen

> **Behoben:** 2026-07-17 auf dem `dashboard-ux`-Branch (noch nicht nach
> `main` gemerged — liegt dort, wartet auf D.5). `apply_tags()`
> dedupliziert Namen jetzt auf `(kind, name.strip().lower())`, bevor
> `dream.tags` aufgebaut wird — dieselbe Normalisierung wie
> `get_or_create_tag()` selbst nutzt, Reihenfolge des ersten Auftretens
> bleibt erhalten. Drei Regressionstests in `tests/test_dreams.py`:
> Duplikat im selben Feld, gleicher Name in verschiedenen Feldern (kein
> Duplikat, `kind` gehört zum Schlüssel), Duplikat trotz Groß-/
> Kleinschreibung und Leerraum-Abweichung.

- **Schweregrad:** Hoch — betraf den Kernpfad (Traum speichern), kein
  Workaround für die betroffene Person sichtbar außer Neueingabe ohne
  Duplikat.
- **Seit wann kaputt:** Mindestens seit v3.0.0, vermutlich seit
  Einführung von `apply_tags()`.
- **Symptom:** Speichern eines Traums schlug mit einem Datenbankfehler
  fehl, wenn **derselbe Name zweimal im selben Feld** vorkam — z. B.
  zwei Traumzeichen namens „Zähne" versehentlich doppelt eingetragen,
  oder ein Ort/eine Person doppelt erfasst. Vermutlich der Fehler, den
  ein Freund von Philipp am 2026-07-17 auf Version 3 beim Traum speichern
  bekommen hat (ungesicherter Verdacht — kein Traceback vom betroffenen
  Rechner vorhanden, siehe „Offene Frage" unten).
- **Ursache:** `backend/helpers.py::apply_tags()` deduplizierte Namen
  innerhalb eines Feldes nicht. Kam derselbe Name zweimal in `names` vor,
  lieferte `get_or_create_tag()` zweimal dasselbe `Tag`-Objekt (zweiter
  Aufruf fand das erste, bereits geflushte Tag via `select()`).
  `dream.tags` enthielt damit dasselbe Tag zweimal → SQLAlchemy versuchte
  zwei identische Zeilen in die Verknüpfungstabelle
  `dreamtag(dream_id, tag_id)` einzufügen → Verstoß gegen deren
  zusammengesetzten Primärschlüssel → Fehler beim Speichern (per
  Standalone-Skript mit temporärer `KLARTRAUM_DATA`-Datenbank
  reproduziert und bestätigt, bevor der Fix geschrieben wurde).
- **Repro-Schritte (vor dem Fix):**
  1. Neuen Traum anlegen.
  2. Im Feld „Traumzeichen" (oder Orte/Personen/Tags) denselben Namen
     zweimal eintragen, z. B. `zähne, zähne`.
  3. Speichern → Fehler statt Erfolg.
- **Offene Frage:** Der ursprüngliche Bericht („InternalError" laut
  SQLAlchemy-Doku-Text) passt eher zu einem generischen DBAPI-Fehler als
  zum hier erwarteten `IntegrityError` — ohne echten Traceback vom
  betroffenen Rechner (die gepackte App loggt nicht in eine Datei) ist
  nicht zweifelsfrei belegt, dass dies dieselbe Ursache war. Falls der
  Freund erneut einen Fehler beim Speichern bekommt, lohnt sich ein
  Update auf die gefixte Version, bevor weiter gesucht wird.
- **Gefunden:** Juli 2026, während der E.1-Arbeit (Verbindungs-Analyse),
  damals bewusst nicht mitgefixt, um den Scope jener Stufe nicht zu
  sprengen — stattdessen hier dokumentiert und separat behoben.
