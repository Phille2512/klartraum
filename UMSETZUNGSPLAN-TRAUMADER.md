# 🫀 Umsetzungsplan „Traumader": Umbenennung, Aufräumen, Logo

> Eigenständige Spezifikation für einen beliebigen Implementierer.
> **Zuerst lesen:** `UMSETZUNGSPLAN.md` Teil A (Konventionen, Fallstricke).
> UI-Sprache: Deutsch.
>
> **Entscheidung (Juli 2026):** Die App heißt ab jetzt **Traumader** —
> organisch, lebendig, durchströmtes Geflecht. Der Einstiegs-Guide heißt
> „Der Traumfaden" (bereits in `UMSETZUNGSPLAN-HILFE.md` H.4 festgelegt).

---

## Stufe T.1: Umbenennung Klartraum → Traumader

Der Name soll an so wenigen Stellen wie möglich hart stehen — als Konstante
bzw. zentral gepflegt:

1. **Frontend:** `<title>` und Header-`<h1>` in `index.html`
   (Header: „🫀 Traumader" — Icon-Emoji darf der Implementierer passend
   wählen, alternativ nach dem neuen Logo ein Inline-SVG),
   `manifest.json` (`name`: „Traumader – Traumtagebuch & Traumwelt",
   `short_name`: „Traumader", `description` anpassen).
2. **Service Worker:** Cache-Präfix `klartraum-vN` → `traumader-v1`
   (Versionszähler neu starten; alte Caches werden durch die
   Activate-Logik ohnehin gelöscht — prüfen, dass das Präfix-Matching
   dabei beide Namen aufräumt).
3. **Texte durchsuchen:** `grep -ri klartraum frontend/ backend/ *.md` —
   UI-Texte und Doku (README, `docs/HANDBUCH.md`, `docs/ARCHITEKTUR.md`,
   `ANLEITUNG-FUER-FREUNDE.md`) umziehen. Traumfaden-Text: Überschrift wird
   „🧵 Der Traumfaden — so ist Traumader gedacht“.
4. **NICHT umbenennen:** Datenordner `~/Klartraum/` und `dreams.db` —
   bestehende Installationen (Philipp + ggf. Freunde) dürfen nicht brechen.
   Stattdessen: `paths.py` prüft zuerst `~/Traumader/`, fällt zurück auf
   vorhandenes `~/Klartraum/` (Alt-Bestand weiterverwenden, nichts kopieren);
   Neuinstallationen bekommen `~/Traumader/`. Anzeige in der
   „Deine Daten“-Karte zeigt den tatsächlichen Pfad.
5. Desktop-Build (`klartraum.spec` → `traumader.spec`, Binary-Name
   „Traumader“) und GitHub-Workflow-Artefaktnamen anpassen.
6. Projektordner/Repo-Name können bleiben (kosmetisch, Philipps Entscheidung).

**Akzeptanz:** `grep -ri klartraum` findet in UI-Texten nichts mehr (Doku darf
den Alt-Namen in historischen Plänen behalten); PWA-Installation zeigt
„Traumader“; bestehende Daten unter `~/Klartraum/` funktionieren unverändert.

## Stufe T.2: Allgemeine Individuationsreise entfernen

**Entscheidung:** Die **allgemeine** Individuationsreise (6 Stationen im
Lernen-Tab, Tabelle `journeystep`, Endpunkte `/api/journey*`) fliegt aus der
Oberfläche — sie hat sich gegenüber der Traumebenen-Variante nicht bewährt.

- **Bleibt vollständig erhalten:** die **Individuationsreise auf Traumebene**
  (`dreamanalysis`-Tabelle, `/api/dreams/{id}/analysis`-Endpunkte und ihre
  UI in den Traumeinträgen) — daran nichts anfassen!
- Entfernen: die Journey-Karte/Fortschrittspfad im Lernen-Tab samt
  zugehörigem JS in `learn.js`; die `/api/journey`-Endpunkte im Backend.
- **Daten nicht vernichten:** Tabelle `journeystep` und vorhandene Zeilen
  bleiben in der Datenbank (kein DROP — falls die Idee zurückkommt).
  Nur Code entfernen.
- Querverweise prüfen: Kompendium/💡-Texte, die auf „Individuationsreise“
  im Lernen-Tab verweisen, umformulieren oder auf die Traumebenen-Variante
  zeigen; `docs/HANDBUCH.md` entsprechend anpassen.

**Akzeptanz:** Lernen-Tab ohne Journey-Karte, keine toten Links/💡-Verweise;
Traumebenen-Analyse in Einträgen funktioniert unverändert; pytest (falls
vorhanden) ohne Journey-Tests grün.

## Stufe T.3: Logo & Icons  ✅ weitgehend erledigt

**Entschieden: Entwurf A „die Traumader“** (verzweigte Ader in Violett-Tönen,
goldene Endpunkte = Träume, dunkler Grund `#12131f`).

Die Icon-PNGs sind bereits erzeugt und liegen im Projekt:
`frontend/icons/icon-192.png` und `icon-512.png` (maskable-sicher, Motiv im
inneren ~78 %). **Rest-Aufgaben für den Implementierer:**
- Favicon-/`apple-touch-icon`-Verweise in `index.html` prüfen (zeigen bereits
  auf `icon-192.png` — dann ist nichts zu tun).
- `sw.js`-Cache bumpen, damit Geräte das neue Icon laden; am Pixel ggf.
  Homescreen-Verknüpfung neu anlegen (Android cacht Icons hartnäckig).

**Akzeptanz:** Homescreen-Icon am Pixel zeigt die Ader; Browser-Tab-Favicon
aktualisiert.

---

## Reihenfolge

```
T.2 Reise entfernen (klein, unabhängig) → T.1 Umbenennung → T.3 Icons
```

Pro Stufe: verifizieren (Desktop + 412 px), `sw.js` bumpen, ein Commit.
