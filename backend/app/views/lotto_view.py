from flask import Blueprint, request
from app.controllers import lotto_controller
from app.utils.responses import ok, error
from app.utils.auth import login_required, admin_required

bp = Blueprint("lotto", __name__)


@bp.get("/lotto/config")
@admin_required
def config():
    # Kept for backwards compatibility with existing clients.
    return ok({"source_url": lotto_controller.get_source_label()})


@bp.post("/lotto/refresh")
@login_required
def refresh():
    try:
        result = lotto_controller.refresh()
        return ok(result, "Lotto history refresh completed.")
    except ValueError as exc:
        return error(str(exc))
    except Exception as exc:
        return error(f"Lotto refresh failed: {exc}", 502)


@bp.get("/lotto/analysis")
@login_required
def analysis():
    try:
        return ok(lotto_controller.get_analysis(
            request.args.get("start_date"),
            request.args.get("end_date")
        ))
    except ValueError as exc:
        return error(str(exc))


@bp.get("/lotto/distribution")
@login_required
def distribution():
    try:
        return ok(lotto_controller.get_distribution(
            request.args.get("start_date"),
            request.args.get("end_date"),
            request.args.get("dimension", "date"),
            request.args.get("ball_set", "both")
        ))
    except ValueError as exc:
        return error(str(exc))


@bp.post("/lotto/check")
@login_required
def check():
    body = request.get_json(silent=True) or {}
    try:
        return ok(lotto_controller.check_numbers(
            body.get("main_numbers"),
            body.get("bonus_number"),
            body.get("start_date"),
            body.get("end_date")
        ))
    except ValueError as exc:
        return error(str(exc))
