from collections import Counter
from datetime import date
import re
import requests
from bs4 import BeautifulSoup

def fetch_html(url):
    if not url.startswith(("https://", "http://")):
        raise ValueError("Only http/https URLs are allowed.")
    response = requests.get(url, timeout=20, headers={"User-Agent": "FinnsWorldPrototype/1.0"})
    response.raise_for_status()
    return response.text

def parse_draws_generic(html, source_url):
    """
    Generic starter parser only. Verify and customize selectors for the chosen
    NZ Lotto source. It intentionally does not guess draw IDs or dates.
    """
    soup = BeautifulSoup(html, "html.parser")
    results = []
    for row in soup.select("tr"):
        text = " ".join(row.stripped_strings)
        numbers = re.findall(r"(?<!\d)(?:[1-9]|[1-3]\d|40)(?!\d)", text)
        date_match = re.search(r"(20\d{2}-\d{2}-\d{2})", text)
        if date_match and len(numbers) >= 6:
            draw_date = date_match.group(1)
            main = numbers[:6]
            results.append({
                "draw_id": draw_date,
                "draw_date": draw_date,
                "numbers": ",".join(main),
                "bonus": numbers[6] if len(numbers) > 6 else "",
                "powerball": "",
                "source_url": source_url
            })
    return results

def analyze_draws(draws):
    sums, weekday, monthday = [], Counter(), Counter()
    for draw in draws:
        nums = [int(x) for x in draw.get("numbers", "").split(",") if x.strip().isdigit()]
        if not nums:
            continue
        draw_date = date.fromisoformat(draw["draw_date"])
        sums.append({"date": draw["draw_date"], "sum": sum(nums)})
        weekday[draw_date.strftime("%A")] += 1
        monthday[str(draw_date.day)] += 1
    return {
        "sum_by_draw": sums,
        "weekday_distribution": dict(weekday),
        "monthday_distribution": dict(sorted(monthday.items(), key=lambda x: int(x[0])))
    }

def compare_numbers(input_numbers, draws):
    target = set(int(x) for x in input_numbers)
    best = 0
    matches = []
    for draw in draws:
        historical = set(int(x) for x in draw.get("numbers", "").split(",") if x.isdigit())
        overlap = len(target & historical)
        if overlap > best:
            best, matches = overlap, []
        if overlap == best:
            matches.append({"draw_date": draw["draw_date"], "overlap": overlap,
                            "numbers": sorted(historical)})
    return {"max_overlap": best, "match_rate": round(best / max(len(target), 1) * 100, 2),
            "matching_draws": matches}
