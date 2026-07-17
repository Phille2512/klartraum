# 🐛 Bugfixes — bekannte Fehler von Traumader

> **Zweck:** Lebendes Sammelbecken für gefundene, aber noch nicht behobene
> Fehler — das Bug-Pendant zu `BACKLOG.md` (dort leben Ideen, hier Defekte).
> Neue Funde landen hier mit Repro-Schritten und Ursache, damit sie sich
> jederzeit unabhängig vom gerade laufenden Umsetzungsplan beheben lassen.
> Behobenes wird nicht gelöscht, sondern mit Datum/Commit abgehakt — so
> bleibt nachvollziehbar, seit wann welche Version wieder sauber ist.

---

## 🔴 Offen

### Doppelter Name im selben Traum-Feld lässt „Traum speichern" abstürzen

- **Schweregrad:** Hoch — betrifft den Kernpfad (Traum speichern), kein
  Workaround für die betroffene Person sichtbar außer Neueingabe ohne
  Duplikat.
- **Seit wann:** Mindestens seit v3.0.0, vermutlich seit Einführung von
  `apply_tags()` — noch unverändert im aktuellen Stand (`dashboard-ux`
  und `main`).
- **Symptom:** Speichern eines Traums schlägt mit einem Datenbankfehler
  fehl, wenn **derselbe Name zweimal im selben Feld** vorkommt — z. B.
  zwei Traumzeichen namens „Zähne" versehentlich doppelt eingetragen,
  oder ein Ort/eine Person doppelt erfasst. Vermutlich der Fehler, den
  ein Freund von Philipp am 2026-07-17 auf Version 3 beim Traum speichern
  bekommen hat (ungesicherter Verdacht — kein Traceback vom betroffenen
  Rechner vorhanden, siehe „Offene Fragen" unten).
- **Ursache:** `backend/helpers.py::apply_tags()` dedupliziert Namen
  innerhalb eines Feldes nicht:
  ```python
  def apply_tags(session: Session, dream: Dream, payload: DreamIn) -> None:
      groups = [
          ("tag", payload.tags),
          ("dream_sign", payload.dream_signs),
          ("place", payload.places),
          ("person", payload.persons),
      ]
      dream.tags = [
          get_or_create_tag(session, name, kind)
          for kind, names in groups
          for name in names
          if name.strip()
      ]
  ```
  Kommt derselbe Name zweimal in `names` vor, liefert `get_or_create_tag()`
  zweimal dasselbe `Tag`-Objekt (zweiter Aufruf findet das erste,
  bereits geflushte Tag via `select()`). `dream.tags` enthält damit das
  gleiche Tag zweimal → SQLAlchemy versucht zwei identische Zeilen in die
  Verknüpfungstabelle `dreamtag(dream_id, tag_id)` einzufügen → Verstoß
  gegen deren zusammengesetzten Primärschlüssel → Fehler beim Speichern
  (per Standalone-Skript mit temporärer `KLARTRAUM_DATA`-Datenbank
  reproduziert und bestätigt).
- **Repro-Schritte:**
  1. Neuen Traum anlegen.
  2. Im Feld „Traumzeichen" (oder Orte/Personen/Tags) denselben Namen
     zweimal eintragen, z. B. `zähne, zähne`.
  3. Speichern → Fehler statt Erfolg.
- **Vorgeschlagener Fix:** Namen pro Feld vor dem Aufbau von `dream.tags`
  deduplizieren, z. B. `dict.fromkeys(names)` statt `names` in der
  List Comprehension (erhält Reihenfolge, entfernt Duplikate) — oder
  gleich in `apply_tags()` über alle vier Gruppen hinweg auf
  `(kind, name.strip().lower())`-Ebene deduplizieren, konsistent mit der
  Normalisierung in `get_or_create_tag()`.
- **Test-Lücke:** In `tests/test_connections.py` bereits als Kommentar
  dokumentiert (E.1-Arbeit, Juli 2026) — ein direkter API-Test für dieses
  Verhalten fehlt noch, da der Fix selbst noch aussteht.
- **Offene Fragen:** Der ursprüngliche Bericht („InternalError" laut
  SQLAlchemy-Doku-Text) passt eher zu einem generischen DBAPI-Fehler als
  zum hier erwarteten `IntegrityError` — ohne echten Traceback vom
  betroffenen Rechner (die gepackte App loggt nicht in eine Datei) ist
  nicht zweifelsfrei belegt, dass dies dieselbe Ursache ist. Bis zur
  Bestätigung durch einen echten Traceback als wahrscheinlichste, aber
  nicht sichere Erklärung markiert.
- **Gefunden:** Juli 2026, während der E.1-Arbeit (Verbindungs-Analyse),
  nicht mitgefixt um Scope der damaligen Stufe nicht zu sprengen.

---

## ✅ Behoben

*(noch keine Einträge)*
