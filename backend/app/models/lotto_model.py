import csv
import json
import re
from datetime import date, datetime
from pathlib import Path

from flask import current_app
from .csv_repository import CsvRepository


CSV_FIELDS = [
    "draw_id", "draw_date", "numbers", "bonus", "powerball", "source_url"
]


def draws_repo():
    return CsvRepository(
        current_app.config["DATA_DIR"] / "lotto_draws.csv",
        CSV_FIELDS
    )


def get_draws(start_date=None, end_date=None):
    rows = draws_repo().all()

    if start_date:
        rows = [r for r in rows if r.get("draw_date", "") >= start_date]
    if end_date:
        rows = [r for r in rows if r.get("draw_date", "") <= end_date]

    return sorted(rows, key=lambda r: r.get("draw_date", ""))


def save_draws(new_rows):
    repo = draws_repo()
    existing = {r["draw_id"]: r for r in repo.all() if r.get("draw_id")}

    for row in new_rows:
        draw_id = row.get("draw_id") or row.get("draw_date")
        if draw_id:
            normalized = dict(row)
            normalized["draw_id"] = draw_id
            existing[draw_id] = normalized

    repo.replace_all(sorted(
        existing.values(),
        key=lambda r: r.get("draw_date", "")
    ))
    return len(new_rows)


def import_legacy_files(folder):
    """
    Import the old year-based CSV-like TXT files created by tidyOriginalLotto.py.
    Expected structure:
        *
        date,June 27th 2026
        weekDay,Saturday
        lotto,2;7;21;24;29;37
        bonus,17
        day,27th
        month,June
        year,2026

    Run this function inside the Flask application context.
    """
    folder = Path(folder)
    imported = []

    for path in sorted(folder.glob("*Lotto.txt")):
        current = {}

        def flush():
            if not current.get("date") or not current.get("lotto") or not current.get("bonus"):
                return
            raw_date = current["date"]
            raw_date = re.sub(r"(?<=\d)(st|nd|rd|th)", "", raw_date)
            draw_date = datetime.strptime(raw_date, "%B %d %Y").date().isoformat()
            main = [int(x) for x in current["lotto"].split(";") if x.strip()]
            bonus = int(current["bonus"])
            if len(main) == 6 and len(set(main + [bonus])) == 7:
                imported.append({
                    "draw_id": draw_date,
                    "draw_date": draw_date,
                    "numbers": json.dumps(main, separators=(",", ":")),
                    "bonus": str(bonus),
                    "powerball": "",
                    "source_url": f"legacy-import:{path.name}"
                })

        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            for row in csv.reader(handle):
                if not row:
                    continue
                if row[0] == "*":
                    flush()
                    current = {}
                elif len(row) >= 2:
                    current[row[0]] = row[1]
            flush()

    save_draws(imported)
    return {
        "imported_or_updated": len(imported),
        "files": len(list(folder.glob("*Lotto.txt")))
    }
