from flask import Blueprint, request
from app.controllers import job_controller
from app.utils.responses import ok, error
from app.utils.auth import login_required, admin_required

bp = Blueprint("jobs", __name__)

@bp.get("/jobs")
@login_required
def list_jobs():
    sources = request.args.getlist("source")
    return ok(job_controller.get_jobs(sources or None, request.args.get("country")))

@bp.post("/jobs/test-record")
@admin_required
def add_test_job():
    try:
        return ok(job_controller.add_test_job(request.get_json(silent=True) or {}), "Job saved.", 201)
    except ValueError as exc:
        return error(str(exc))

@bp.get("/jobs/cv-files")
@login_required
def cv_files():
    return ok(job_controller.list_cv_files())

@bp.post("/jobs/cv-files")
@login_required
def upload_cv():
    file = request.files.get("file")
    if not file:
        return error("PDF file is required.")
    try:
        return ok(job_controller.upload_cv(file), "CV uploaded.", 201)
    except ValueError as exc:
        return error(str(exc))

@bp.delete("/jobs/cv-files/<file_id>")
@login_required
def delete_cv(file_id):
    return ok({"deleted": True}) if job_controller.delete_cv_file(file_id) else error("File not found.", 404)

@bp.post("/jobs/<job_id>/analyze")
@login_required
def analyze(job_id):
    result = job_controller.analyze(job_id)
    return ok(result) if result else error("Job not found.", 404)
