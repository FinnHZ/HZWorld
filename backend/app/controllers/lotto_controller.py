from datetime import date
from flask import current_app

from app.models import lotto_model
from app.services import lotto_service


def get_source_label():
    return lotto_service.SOURCE_LABEL


def _validate_dates(start_date, end_date):
    for value, label in ((start_date, "start_date"), (end_date, "end_date")):
        if value:
            try:
                date.fromisoformat(value)
            except ValueError:
                raise ValueError(f"{label} must use YYYY-MM-DD format.")
    if start_date and end_date and start_date > end_date:
        raise ValueError("Start date must not be later than end date.")


def refresh():
    existing = lotto_model.get_draws()
    fetched, months = lotto_service.fetch_missing_draws(existing)

    existing_by_date = {r["draw_date"]: r for r in existing}
    inserted = sum(1 for r in fetched if r["draw_date"] not in existing_by_date)
    updated = sum(1 for r in fetched if r["draw_date"] in existing_by_date)

    lotto_model.save_draws(fetched)
    all_draws = lotto_model.get_draws()

    return {
        "fetched": len(fetched),
        "new_draws": inserted,
        "checked_or_updated": updated,
        "total_draws": len(all_draws),
        "latest_date": all_draws[-1]["draw_date"] if all_draws else None,
        "months_checked": months,
        "source": lotto_service.SOURCE_LABEL
    }


def get_analysis(start_date=None, end_date=None):
    _validate_dates(start_date, end_date)
    draws = lotto_model.get_draws(start_date, end_date)
    return {
        "draw_count": len(draws),
        "draws": draws,
        "analysis": lotto_service.analyze_draws(draws),
        "date_summary": {
            "start_date": draws[0]["draw_date"] if draws else None,
            "end_date": draws[-1]["draw_date"] if draws else None,
            "draw_count": len(draws)
        }
    }


def get_distribution(start_date=None, end_date=None,
                     dimension="date", ball_set="both"):
    _validate_dates(start_date, end_date)
    draws = lotto_model.get_draws(start_date, end_date)
    return lotto_service.distribution_3d(draws, dimension, ball_set)


def check_numbers(main_numbers, bonus_number, start_date=None, end_date=None):
    _validate_dates(start_date, end_date)

    if not isinstance(main_numbers, list) or len(main_numbers) != 6:
        raise ValueError("Please enter exactly six main Lotto numbers.")

    if any(type(n) is not int or n < 1 or n > 40 for n in main_numbers):
        raise ValueError("Every Lotto number must be an integer from 1 to 40.")

    if len(set(main_numbers)) != 6:
        raise ValueError("The six main Lotto numbers must be different.")

    if type(bonus_number) is not int or bonus_number < 1 or bonus_number > 40:
        raise ValueError("Bonus number must be an integer from 1 to 40.")

    if bonus_number in main_numbers:
        raise ValueError("Bonus number must be different from the six main numbers.")

    draws = lotto_model.get_draws(start_date, end_date)
    return lotto_service.compare_numbers(main_numbers, bonus_number, draws)
