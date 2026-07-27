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
        # TD.1: Tracker-Felder denormalisiert mit ausliefern -- stages_json
        # roh als String (verschachteltes JSON in JSON/CSV-Zelle).
        row["sleep_source"] = night.source if night else None
        row["rem_minutes"] = night.rem_minutes if night else None
        row["deep_minutes"] = night.deep_minutes if night else None
        row["light_minutes"] = night.light_minutes if night else None
        row["awake_minutes"] = night.awake_minutes if night else None
        row["awakenings"] = night.awakenings if night else None
        row["tracker_score"] = night.tracker_score if night else None
        row["hr_min"] = night.hr_min if night else None
        row["hr_avg"] = night.hr_avg if night else None
        row["hr_max"] = night.hr_max if night else None
        row["sleep_latency_minutes"] = night.sleep_latency_minutes if night else None
        row["stages_json"] = night.stages_json if night else None
        rows.append(row)
    filename = f"klartraum-export-{dt.date.today().isoformat()}"

    if format == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "id", "date", "title", "content", "lucidity", "sleep_quality",
            "substances", "substance_other",
            "big_dream", "emotions",
            "falsches_erwachen", "schlafparalyse", "traum_im_traum", "wiederkehrend", "albtraum",
            "tags", "dream_signs", "places", "persons", "notes_analysis",
            "bed_time", "wake_time", "sleep_minutes", "sleep_confidence",
            "sleep_source", "rem_minutes", "deep_minutes", "light_minutes", "awake_minutes",
            "awakenings", "tracker_score", "hr_min", "hr_avg", "hr_max",
            "sleep_latency_minutes", "stages_json",
        ])
        for r in rows:
            writer.writerow([
                r["id"], r["date"], r["title"], r["content"], r["lucidity"],
                r["sleep_quality"], "|".join(r["substances"]), r["substance_other"] or "",
                1 if r["big_dream"] else 0, "|".join(r["emotions"]),
                1 if r["falsches_erwachen"] else 0, 1 if r["schlafparalyse"] else 0,
                1 if r["traum_im_traum"] else 0, 1 if r["wiederkehrend"] else 0,
                1 if r["albtraum"] else 0,
                "|".join(r["tags"]), "|".join(r["dream_signs"]),
                "|".join(r["places"]), "|".join(r["persons"]),
                r["notes_analysis"] or "",
                r["bed_time"] or "", r["wake_time"] or "",
                r["sleep_minutes"] if r["sleep_minutes"] is not None else "",
                r["sleep_confidence"] or "",
                r["sleep_source"] or "",
                r["rem_minutes"] if r["rem_minutes"] is not None else "",
                r["deep_minutes"] if r["deep_minutes"] is not None else "",
                r["light_minutes"] if r["light_minutes"] is not None else "",
                r["awake_minutes"] if r["awake_minutes"] is not None else "",
                r["awakenings"] if r["awakenings"] is not None else "",
                r["tracker_score"] if r["tracker_score"] is not None else "",
                r["hr_min"] if r["hr_min"] is not None else "",
                r["hr_avg"] if r["hr_avg"] is not None else "",
                r["hr_max"] if r["hr_max"] is not None else "",
                r["sleep_latency_minutes"] if r["sleep_latency_minutes"] is not None else "",
                r["stages_json"] or "",
            ])
        return Response(
            "﻿" + buf.getvalue(),
            media_type="text/csv; charset=utf-8-sig",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"},
        )

    return Response(
        json.dumps(rows, default=str, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}.json"},
    )
