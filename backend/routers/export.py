"""S.3: Daten-Info + Export, Umzugsarbeit aus main.py."""
import csv
import datetime as dt
import io
import json
import os

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlmodel import Session, col, select

import backup
from deps import get_session, require_auth
from helpers import to_out
from models import Dream, Night
from paths import DATA_DIR

router = APIRouter(prefix="/api", dependencies=[Depends(require_auth)])


@router.get("/datainfo")
def data_info(session: Session = Depends(get_session)):
    db_file = DATA_DIR / "dreams.db"
    db_size = os.path.getsize(db_file) if db_file.exists() else 0
    dream_count = len(session.exec(select(Dream)).all())
    return {
        "data_dir": str(DATA_DIR),
        "db_file": str(db_file),
        "db_size_bytes": db_size,
        "dream_count": dream_count,
        **backup.backup_info(),
    }


@router.get("/export")
def export_data(format: str = "json", session: Session = Depends(get_session)):
    dreams = session.exec(select(Dream).order_by(col(Dream.date))).all()
    # N.4: Nacht-Felder pro Traum-Zeile denormalisiert (Data-Science-freundlich,
    # kein Join beim Auswerten nötig). Träume ohne Nacht-Eintrag bleiben leer.
    nights_by_date = {n.date: n for n in session.exec(select(Night)).all()}
    rows = []
    for d in dreams:
        row = to_out(d).model_dump()
        night = nights_by_date.get(d.date)
        row["bed_time"] = night.bed_time if night else None
        row["wake_time"] = night.wake_time if night else None
        row["sleep_minutes"] = night.sleep_minutes if night else None
        row["sleep_confidence"] = night.confidence if night else None
        rows.append(row)
    filename = f"klartraum-export-{dt.date.today().isoformat()}"

    if format == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "id", "date", "title", "content", "lucidity", "sleep_quality",
            "substances", "substance_other", "tags", "dream_signs", "places", "persons", "notes_analysis",
            "bed_time", "wake_time", "sleep_minutes", "sleep_confidence",
        ])
        for r in rows:
            writer.writerow([
                r["id"], r["date"], r["title"], r["content"], r["lucidity"],
                r["sleep_quality"], "|".join(r["substances"]), r["substance_other"] or "",
                "|".join(r["tags"]), "|".join(r["dream_signs"]),
                "|".join(r["places"]), "|".join(r["persons"]),
                r["notes_analysis"] or "",
                r["bed_time"] or "", r["wake_time"] or "",
                r["sleep_minutes"] if r["sleep_minutes"] is not None else "",
                r["sleep_confidence"] or "",
            ])
        return Response(
            buf.getvalue(),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"},
        )

    return Response(
        json.dumps(rows, default=str, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}.json"},
    )
