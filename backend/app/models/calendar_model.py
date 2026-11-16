from flask import current_app
from .csv_repository import CsvRepository
from datetime import datetime, timezone
import uuid


FIELDS = [
    "id",
    "event_date",
    "title",
    "description",
    "priority",
    "event_type",
    "remote_sync",
    "completed",
    "created_at",
    "updated_at"
]


def repo():
    return CsvRepository(
        current_app.config["DATA_DIR"] / "calendar_events.csv",
        FIELDS
    )


def list_events(start_date=None, end_date=None):

    rows = repo().all()

    if start_date:
        rows = [
            r for r in rows
            if r["event_date"] >= start_date
        ]

    if end_date:
        rows = [
            r for r in rows
            if r["event_date"] <= end_date
        ]

    return sorted(
        rows,
        key=lambda r: (r["event_date"], r["created_at"])
    )


def save_event(data, event_id=None):

    now = datetime.now(timezone.utc).isoformat()

    repository = repo()
    rows = repository.all()

    if event_id:

        for i, row in enumerate(rows):

            if row["id"] == event_id:

                updated = {
                    **row,
                    **data,
                    "updated_at": now
                }

                rows[i] = updated

                repository.replace_all(rows)

                return updated

        raise KeyError("Event not found.")

    row = {
        **{f: "" for f in FIELDS},
        **data,
        "id": str(uuid.uuid4()),
        "created_at": now,
        "updated_at": now
    }

    repository.insert(row)

    return row


def delete_event(event_id):

    return repo().delete_where(
        lambda row: row["id"] == event_id
    )
