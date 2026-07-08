import socket
import sys
import webbrowser

import uvicorn

from paths import DATA_DIR


def find_free_port(start: int = 8000, tries: int = 10) -> int:
    for port in range(start, start + tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    return start + tries


def get_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "nicht verfügbar"


def main() -> None:
    port = find_free_port()
    lan_ip = get_lan_ip()
    db_path = DATA_DIR / "dreams.db"

    print()
    print("  \U0001f319 Klartraum läuft!")
    print(f"     Am Computer:  http://localhost:{port}")
    print(f"     Am Handy:     http://{lan_ip}:{port}  (gleiches WLAN)")
    print(f"     Deine Daten:  {db_path}")
    print("     Dieses Fenster schließen beendet Klartraum.")
    print()

    webbrowser.open(f"http://localhost:{port}")

    try:
        uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="warning")
    except KeyboardInterrupt:
        print("\nKlartraum beendet. Gute Nacht! \U0001f319")
        sys.exit(0)


if __name__ == "__main__":
    main()
