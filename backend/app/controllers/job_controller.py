from app.models import job_model
from app.services.pdf_service import save_pdf
from app.services.job_service import analyze_job
from flask import current_app
from pathlib import Path
from datetime import datetime, timezone
import uuid

def get_jobs(sources=None, country=None):
    return job_model.list_jobs(sources, country)

def add_test_job(data):
    required = ["source", "country", "region", "title", "company"]
    if any(not data.get(k) for k in required):
        raise ValueError("source, country, region, title and company are required.")
    return job_model.add_job(data)

def upload_cv(file_storage):
    saved = save_pdf(file_storage, current_app.config["UPLOAD_DIR"])
    row = {"id": str(uuid.uuid4()), **saved,
           "uploaded_at": datetime.now(timezone.utc).isoformat()}
    job_model.cv_files_repo().insert(row)
    return row

def list_cv_files():
    return job_model.cv_files_repo().all()

def delete_cv_file(file_id):
    repo = job_model.cv_files_repo()
    rows = repo.all()
    target = next((r for r in rows if r["id"] == file_id), None)
    if not target:
        return False
    path = Path(current_app.config["UPLOAD_DIR"]) / target["stored_name"]
    if path.exists():
        path.unlink()
    repo.delete_where(lambda r: r["id"] == file_id)
    return True

def analyze(job_id):
    job = next((j for j in job_model.jobs_repo().all() if j["id"] == job_id), None)
    if not job:
        return None
    return analyze_job(job)
