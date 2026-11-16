from flask import current_app
from .csv_repository import CsvRepository
from datetime import datetime, timezone
import uuid

def jobs_repo():
    return CsvRepository(current_app.config["DATA_DIR"] / "jobs.csv",
        ["id", "source", "country", "region", "title", "company", "company_size",
         "local_reputation", "global_reputation", "description", "url", "created_at"])

def cv_files_repo():
    return CsvRepository(current_app.config["DATA_DIR"] / "cv_files.csv",
        ["id", "filename", "stored_name", "uploaded_at"])

def list_jobs(sources=None, country=None):
    rows = jobs_repo().all()
    if sources:
        rows = [r for r in rows if r["source"] in sources]
    if country:
        rows = [r for r in rows if r["country"].lower() == country.lower()]
    return rows

def add_job(data):
    data = dict(data)
    data.update(id=str(uuid.uuid4()), created_at=datetime.now(timezone.utc).isoformat())
    return jobs_repo().insert(data)
