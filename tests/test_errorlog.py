"""Fehler-Log (fehler.log in DATA_DIR): unbehandelte Fehler landen mit
Traceback in der Datei, damit Nutzer sie beim Melden einfach schicken können."""
from paths import DATA_DIR

from main import _log_error


def test_log_error_schreibt_traceback_utf8():
    try:
        raise RuntimeError("TEST-Absturz 🌙 mit Emoji")
    except RuntimeError:
        _log_error("/api/dreams")
    text = (DATA_DIR / "fehler.log").read_text(encoding="utf-8")
    assert "TEST-Absturz 🌙 mit Emoji" in text
    assert "/api/dreams" in text
    assert "RuntimeError" in text


def test_log_error_rotiert_bei_groesse():
    log = DATA_DIR / "fehler.log"
    log.write_text("x" * 600_000, encoding="utf-8")
    try:
        raise ValueError("TEST-nach-Rotation")
    except ValueError:
        _log_error("/api/stats")
    assert (DATA_DIR / "fehler.log.alt").exists()
    text = log.read_text(encoding="utf-8")
    assert "TEST-nach-Rotation" in text
    assert len(text) < 10_000
