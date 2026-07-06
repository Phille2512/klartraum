# 🌙 Klartraum-App

Persönliche App zum Klarträumen-Lernen: Traumtagebuch, Traumzeichen-Analyse und
Reality-Check-Training. FastAPI + SQLite im Backend, Vanilla-JS-PWA im Frontend.

## Starten (MacBook)

```bash
cd "/Users/phille/Desktop/Application Klarträumen"

# Einmalig: Umgebung anlegen
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Server starten (erreichbar im ganzen WLAN)
.venv/bin/uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000
```

Dann im Browser: <http://localhost:8000>

Die Datenbank (`backend/dreams.db`) wird beim ersten Start automatisch angelegt.

## Zugriff vom Google Pixel (gleiches WLAN)

1. IP-Adresse des MacBooks herausfinden:
   ```bash
   ipconfig getifaddr en0
   ```
2. Am Pixel im Chrome öffnen: `http://<MacBook-IP>:8000`
3. Über das Chrome-Menü **„Zum Startbildschirm hinzufügen"** wählen — die App
   bekommt ein eigenes Icon.

> **Hinweis:** Über `http://<IP>` läuft die App als normale Web-App. Die vollen
> PWA-Funktionen (echte Installation, Offline-Start, Benachrichtigungen) erfordern
> HTTPS — siehe unten.

## Optional: HTTPS im Heimnetz (volle PWA am Pixel)

Browser erlauben Service Worker und Benachrichtigungen nur über HTTPS
(Ausnahme: `localhost`). Mit [mkcert](https://github.com/FiloSottile/mkcert)
geht das auch im Heimnetz:

```bash
brew install mkcert
mkcert -install

# Zertifikat für die MacBook-IP erzeugen (IP ggf. anpassen)
mkdir -p certs
mkcert -cert-file certs/cert.pem -key-file certs/key.pem localhost 192.168.1.100

# Server mit TLS starten
.venv/bin/uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8443 \
  --ssl-certfile certs/cert.pem --ssl-keyfile certs/key.pem
```

Damit das Pixel dem Zertifikat vertraut: die Datei aus `mkcert -CAROOT`
(`rootCA.pem`) aufs Handy übertragen und unter
**Einstellungen → Sicherheit → Weitere Einstellungen → Zertifikat installieren → CA-Zertifikat**
installieren. Danach `https://<MacBook-IP>:8443` öffnen und installieren.

⚠️ Ändert sich die IP des MacBooks (DHCP), muss das Zertifikat neu erzeugt werden.
Tipp: dem MacBook im Router eine feste IP geben.

## Projektstruktur

```
backend/    FastAPI: main.py (API), models.py (SQLModel), database.py (SQLite)
frontend/   Single-Page-App: index.html, css/, js/, manifest.json, sw.js
```

## Geplant für später

- KI-Traumanalyse per Claude API (Feld `notes_analysis` ist vorbereitet)
- Cloud-Deployment (z. B. Fly.io) für Zugriff von unterwegs
- Offline-Erfassung mit Synchronisation
