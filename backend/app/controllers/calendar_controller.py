from app.models import calendar_model


def list_events(start_date=None, end_date=None):
    return calendar_model.list_events(start_date, end_date)


def _to_bool(value):
    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        return value.strip().lower() in ("true", "1", "yes")

    return bool(value)


def save_event(data, event_id=None):

    if not isinstance(data, dict):
        raise ValueError("Invalid event data.")

    required = ["event_date", "title", "event_type", "priority"]

    if any(not data.get(k) for k in required):
        raise ValueError(
            "event_date, title, event_type and priority are required."
        )

    if data["priority"] not in ("high", "medium", "low"):
        raise ValueError("priority must be high, medium or low.")

    if data["event_type"] not in ("work", "personal", "family", "other"):
        raise ValueError("Invalid event_type.")

    # Only accept fields that the calendar is allowed to modify.
    allowed_fields = {
        "event_date",
        "title",
        "description",
        "priority",
        "event_type",
        "remote_sync",
        "completed"
    }

    clean_data = {
        k: data[k]
        for k in allowed_fields
        if k in data
    }

    clean_data["remote_sync"] = str(
        _to_bool(clean_data.get("remote_sync", False))
    ).lower()

    clean_data["completed"] = str(
        _to_bool(clean_data.get("completed", False))
    ).lower()

    return calendar_model.save_event(clean_data, event_id)


def delete_event(event_id):
    return calendar_model.delete_event(event_id) > 0
