from flask import Blueprint, request, session
from app.controllers import cv_controller
from app.utils.responses import ok, error
from app.utils.auth import login_required, admin_required

bp = Blueprint("cv", __name__)

@bp.get("/cv")
@login_required
def get_cv():
    user_id = session.get("user_id")
    return ok(cv_controller.get_cv(user_id))

@bp.put("/cv/<section_key>")
@admin_required
def update_section(section_key):
    body = request.get_json(silent=True) or {}
    content = body.get("content")
    if not isinstance(content, str):
        return error("content must be a string.")
    try:
        return ok(cv_controller.update_cv_section(section_key, content), "CV section saved.")
    except ValueError as exc:
        return error(str(exc))
