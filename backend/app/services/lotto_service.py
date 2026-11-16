from collections import Counter, defaultdict
import json
from calendar import monthrange
from datetime import date, datetime
from zoneinfo import ZoneInfo
import re

import requests
from bs4 import BeautifulSoup


# Secondary, server-rendered archive used because the official MyLotto Results
# page is a JavaScript application and does not expose its result data in the
# initial HTML response. Change this constant here if you later adopt another
# source or an official data feed.
ARCHIVE_MONTH_URL = "https://www.luckiwis.nz/lotto-results/{year}/{month:02d}"
SOURCE_LABEL = "Luckiwis NZ Lotto results archive (secondary source)"
USER_AGENT = "FinnsWorldLottoHistory/1.0"


def _month_range(start, end):
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        yield year, month
        if month == 12:
            year, month = year + 1, 1
        else:
            month += 1


def _parse_month_page(html, page_url):
    soup = BeautifulSoup(html, "html.parser")
    parsed = []

    for anchor in soup.select('a[href*="/nz-lotto-"]'):
        text = " ".join(anchor.stripped_strings)
        draw_match = re.search(r"Draw\s*#(\d+)", text, re.I)
        date_match = re.search(
            r"(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+"
            r"(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})",
            text,
            re.I
        )
        if not draw_match or not date_match:
            continue

        # The archive month card lists six Lotto balls, Bonus, then Powerball.
        tail = text[date_match.end():]
        values = [int(x) for x in re.findall(r"(?<!\d)\d{1,2}(?!\d)", tail)]
        if len(values) < 7:
            continue

        main = values[:6]
        bonus = values[6]
        powerball = values[7] if len(values) > 7 else ""

        if (
            len(set(main)) != 6
            or len(set(main + [bonus])) != 7
            or any(n < 1 or n > 40 for n in main + [bonus])
        ):
            continue

        day, month_name, year = date_match.groups()
        draw_date = datetime.strptime(
            f"{day} {month_name} {year}", "%d %B %Y"
        ).date().isoformat()

        parsed.append({
            # Date is the stable key in this app: there is one Lotto draw per date.
            "draw_id": draw_date,
            "draw_date": draw_date,
            "numbers": json.dumps(main, separators=(",", ":")),
            "bonus": str(bonus),
            "powerball": str(powerball) if powerball != "" else "",
            "source_url": page_url
        })

    # A month page can contain links to neighbouring draws in some layouts.
    unique = {row["draw_date"]: row for row in parsed}
    return sorted(unique.values(), key=lambda row: row["draw_date"])


def fetch_missing_draws(existing_draws, today=None):
    """
    Fetch month archive pages from the month of the newest saved draw through
    the current month. Re-fetching the newest saved month also catches a draw
    missing from the middle of that month. Existing dates are de-duplicated
    later by the CSV model.
    """
    if not existing_draws:
        raise ValueError(
            "The Lotto CSV is empty. Import your legacy 2011–2026 history files "
            "first, then use Refresh to fetch newer draws."
        )

    today = today or datetime.now(ZoneInfo("Pacific/Auckland")).date()
    latest_saved = max(
        date.fromisoformat(row["draw_date"])
        for row in existing_draws
        if row.get("draw_date")
    )
    start = latest_saved.replace(day=1)

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    collected = []
    fetched_months = []

    for year, month in _month_range(start, today):
        page_url = ARCHIVE_MONTH_URL.format(year=year, month=month)
        try:
            response = session.get(page_url, timeout=25)
            response.raise_for_status()
            month_rows = _parse_month_page(response.text, page_url)
            if not month_rows:
                raise ValueError(
                    "The page loaded, but no valid Lotto draw rows were found. "
                    "The archive page layout may have changed."
                )
            collected.extend(month_rows)
            fetched_months.append(f"{year}-{month:02d}")
        except Exception as exc:
            raise RuntimeError(
                f"Could not update Lotto history for {year}-{month:02d}: {exc}"
            ) from exc

    # Never overwrite a newer row with an older archive result.
    newest = today.isoformat()
    collected = [r for r in collected if r["draw_date"] <= newest]
    return collected, fetched_months


def _numbers(draw):
    """Read main numbers from list, JSON-array, comma or semicolon CSV text."""
    raw = draw.get("numbers", "")
    if isinstance(raw, list):
        values = raw
    else:
        text = str(raw or "").strip()
        values = []
        if text.startswith("["):
            try:
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    values = parsed
            except json.JSONDecodeError:
                values = []
        if not values and text:
            values = re.split(r"[;,]", text)

    try:
        return [int(str(value).strip()) for value in values if str(value).strip()]
    except (TypeError, ValueError):
        return []


def _selected_numbers(draw, ball_set):
    main = _numbers(draw)
    bonus = int(draw["bonus"]) if str(draw.get("bonus", "")).isdigit() else None
    if ball_set == "lotto":
        return main
    if ball_set == "bonus":
        return [bonus] if bonus is not None else []
    if ball_set == "both":
        return main + ([bonus] if bonus is not None else [])
    raise ValueError("ball_set must be lotto, bonus or both.")


def analyze_draws(draws):
    """Build chart statistics from the already date-filtered draw list."""
    draw_timing = []
    weekday = Counter()
    monthday = Counter()
    number_counts = Counter()
    valid_draw_count = 0

    for draw in sorted(draws, key=lambda item: item.get("draw_date", "")):
        main = _numbers(draw)
        if len(main) != 6 or len(set(main)) != 6:
            continue

        draw_date = date.fromisoformat(draw["draw_date"])
        draw_timing.append({"date": draw["draw_date"], "sum": sum(main)})
        weekday[draw_date.strftime("%A")] += 1
        monthday[str(draw_date.day)] += 1
        number_counts.update(main)
        valid_draw_count += 1

    # Probability = the percentage of draws in which the number appeared
    # among the six main balls. The theoretical average is 6 / 40 = 15%.
    number_probability = []
    for number in range(1, 41):
        count = number_counts[number]
        probability = count / valid_draw_count * 100 if valid_draw_count else 0
        number_probability.append({
            "number": number,
            "count": count,
            "probability": round(probability, 2)
        })

    return {
        "draw_timing": draw_timing,
        "sum_by_draw": draw_timing,  # Backward-compatible alias.
        "number_probability": number_probability,
        "theoretical_average_probability": 15.0,
        "weekday_distribution": dict(weekday),
        "monthday_distribution": dict(sorted(
            monthday.items(), key=lambda item: int(item[0])
        )),
        "valid_draw_count": valid_draw_count
    }


def distribution_3d(draws, dimension="date", ball_set="both"):
    if dimension not in {"date", "weekDay", "month"}:
        raise ValueError("dimension must be date, weekDay or month.")

    if ball_set not in {"lotto", "bonus", "both"}:
        raise ValueError("ball_set must be lotto, bonus or both.")

    if dimension == "date":
        labels = [
            f"{day}{'th' if 11 <= day % 100 <= 13 else {1:'st',2:'nd',3:'rd'}.get(day % 10, 'th')}"
            for day in range(1, 32)
        ]
        def category(d):
            return date.fromisoformat(d["draw_date"]).day - 1
    elif dimension == "weekDay":
        labels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Total"]
        def category(d):
            return date.fromisoformat(d["draw_date"]).weekday()
    else:
        labels = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        def category(d):
            return date.fromisoformat(d["draw_date"]).month - 1

    counts = defaultdict(Counter)
    draw_counts = Counter()

    for draw in draws:
        try:
            idx = category(draw)
            values = _selected_numbers(draw, ball_set)
        except (ValueError, KeyError):
            continue
        draw_counts[idx] += 1
        for number in values:
            counts[idx][number] += 1

    if dimension == "weekDay":
        draw_counts[7] = len(draws)
        for day_idx in range(7):
            for number, count in counts[day_idx].items():
                counts[7][number] += count

    z_values = []
    for ball_index, ball in enumerate(range(1, 41)):
        for category_index, _label in enumerate(labels):
            denominator = draw_counts[category_index]
            frequency = counts[category_index][ball] / denominator if denominator else 0
            z_values.append([ball_index, category_index, round(frequency, 6)])

    return {
        "x_ball": list(range(1, 41)),
        "y_dateday": labels,
        "z_count": z_values,
        "chart": "3D",
        "dimension": dimension,
        "ball_set": ball_set,
        "draw_count": len(draws)
    }


def compare_numbers(main_numbers, bonus_number, draws):
    target = set(main_numbers + [bonus_number])
    buckets = {i: {"match_count": i, "percentage": round(i / 7 * 100, 2),
                   "draw_count": 0, "sample_dates": []} for i in range(8)}

    for draw in draws:
        historical = set(_numbers(draw))
        if str(draw.get("bonus", "")).isdigit():
            historical.add(int(draw["bonus"]))
        overlap = len(target & historical)
        buckets[overlap]["draw_count"] += 1
        if len(buckets[overlap]["sample_dates"]) < 12:
            buckets[overlap]["sample_dates"].append(draw["draw_date"])

    return {
        "draw_count": len(draws),
        "distribution": [buckets[i] for i in range(7, -1, -1)]
    }
