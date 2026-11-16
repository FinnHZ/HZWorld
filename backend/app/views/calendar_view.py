from flask import Blueprint, request, jsonify
from app.controllers import calendar_controller
from app.utils.responses import ok, error
# from app.utils.auth import login_required
from app.utils.auth import admin_required


bp = Blueprint("calendar", __name__)


def api_success(data, status_code=200):
    """Return a standard successful API response."""
    return jsonify({
        "success": True,
        "data": data
    }), status_code


def api_error(message, status_code=400):
    """Return a standard error API response."""
    return jsonify({
        "success": False,
        "message": message
    }), status_code


@bp.route("/calendar/events", methods=["GET"])
@admin_required
def get_events():
    """
    Retrieve calendar events.

    Optional query parameters:
        start_date: YYYY-MM-DD
        end_date:   YYYY-MM-DD
    """

    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    try:
        events = calendar_controller.list_events(
            start_date,
            end_date
        )

        return api_success(events)

    except Exception:
        return api_error("Unable to retrieve calendar events.", 500)


@bp.route("/calendar/events", methods=["POST"])
@admin_required
def create_event():
    """Create a new calendar event."""

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return api_error("Invalid JSON request body.", 400)

    try:
        result = calendar_controller.save_event(data)

        return api_success(result, 201)

    except ValueError as ex:
        return api_error(str(ex), 400)

    except Exception:
        return api_error("Unable to create calendar event.", 500)


@bp.route("/calendar/events/<event_id>", methods=["PUT"])
@admin_required
def update_event(event_id):
    """Update an existing calendar event."""

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return api_error("Invalid JSON request body.", 400)

    try:
        result = calendar_controller.save_event(
            data,
            event_id=event_id
        )

        if result is None:
            return api_error("Calendar event not found.", 404)

        return api_success(result)

    except ValueError as ex:
        return api_error(str(ex), 400)

    except Exception:
        return api_error("Unable to update calendar event.", 500)


@bp.route("/calendar/events/<event_id>", methods=["DELETE"])
@admin_required
def delete_event(event_id):
    """Delete an existing calendar event."""

    try:
        result = calendar_controller.delete_event(event_id)

        if not result:
            return api_error("Calendar event not found.", 404)

        return api_success({
            "id": event_id,
            "deleted": True
        })

    except Exception:
        return api_error("Unable to delete calendar event.", 500)