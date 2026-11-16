#!/usr/bin/env python3
"""
Convert the old year-based *Lotto.txt files into Finn's World lotto_draws.csv.

Expected input files (in the same folder as this script):
    2011Lotto.txt
    2012Lotto.txt
    ...
    2026Lotto.txt

Default output:
    ../data/lotto_draws.csv

Only Python's standard library is required.
"""

import argparse
import csv
import re
import sys
from datetime import datetime
from pathlib import Path

CSV_FIELDS = [
    "draw_id",
    "draw_date",
    "numbers",
    "bonus",
    "powerball",
    "source_url",
]


def parse_legacy_file(path: Path):
    """Yield normalized website CSV rows from one legacy TXT file."""
    records = []
    current = {}
    errors = []

    def flush(record_number):
        if not current:
            return

        raw_date = current.get("date", "").strip()
        raw_lotto = current.get("lotto", "").strip()
        raw_bonus = current.get("bonus", "").strip()

        if not raw_date or not raw_lotto or not raw_bonus:
            errors.append(
                f"record {record_number}: missing date, lotto or bonus field"
            )
            return

        # Convert dates such as 'June 27th 2026' to '2026-06-27'.
        cleaned_date = re.sub(
            r"(?<=\d)(st|nd|rd|th)\b", "", raw_date, flags=re.IGNORECASE
        )
        try:
            draw_date = datetime.strptime(
                cleaned_date.strip(), "%B %d %Y"
            ).date().isoformat()
        except ValueError:
            errors.append(
                f"record {record_number}: invalid date {raw_date!r}"
            )
            return

        try:
            main_numbers = [
                int(value.strip())
                for value in re.split(r"[;,\s]+", raw_lotto)
                if value.strip()
            ]
            bonus = int(raw_bonus)
        except ValueError:
            errors.append(
                f"record {record_number}: lotto/bonus contains a non-integer"
            )
            return

        all_numbers = main_numbers + [bonus]
        if (
            len(main_numbers) != 6
            or len(set(main_numbers)) != 6
            or len(set(all_numbers)) != 7
            or any(number < 1 or number > 40 for number in all_numbers)
        ):
            errors.append(
                f"record {record_number}: invalid numbers "
                f"(six unique main numbers and a different bonus, 1-40, required)"
            )
            return

        records.append({
            "draw_id": draw_date,
            "draw_date": draw_date,
            # IMPORTANT: the website backend expects comma-separated numbers.
            "numbers": ",".join(str(number) for number in main_numbers),
            "bonus": str(bonus),
            # The old TXT files do not contain Powerball values.
            "powerball": "",
            "source_url": f"legacy-import:{path.name}",
        })

    try:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.reader(handle)
            record_number = 0

            for row in reader:
                if not row:
                    continue

                key = row[0].strip()
                if key == "*":
                    if current:
                        flush(record_number)
                    current = {}
                    record_number += 1
                elif len(row) >= 2:
                    current[key] = row[1].strip()

            if current:
                flush(record_number)

    except (OSError, csv.Error) as exc:
        errors.append(f"could not read file: {exc}")

    return records, errors


def read_existing_csv(path: Path):
    """Read an existing website CSV so conversion can safely merge with it."""
    if not path.exists():
        return {}

    existing = {}
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                draw_id = (row.get("draw_id") or row.get("draw_date") or "").strip()
                if draw_id:
                    existing[draw_id] = {
                        field: (row.get(field) or "").strip()
                        for field in CSV_FIELDS
                    }
                    existing[draw_id]["draw_id"] = draw_id
    except (OSError, csv.Error) as exc:
        raise RuntimeError(f"Could not read existing output CSV: {exc}") from exc

    return existing


def main():
    parser = argparse.ArgumentParser(
        description="Convert old Lotto TXT history files to the website CSV format."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="Folder containing *Lotto.txt files (default: this script's folder).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "data" / "lotto_draws.csv",
        help="Output CSV path (default: ../data/lotto_draws.csv).",
    )
    args = parser.parse_args()

    input_dir = args.input.resolve()
    output_path = args.output.resolve()

    if not input_dir.is_dir():
        print(f"ERROR: input folder does not exist: {input_dir}", file=sys.stderr)
        return 1

    txt_files = sorted(input_dir.glob("*Lotto.txt"))
    if not txt_files:
        print(f"ERROR: no '*Lotto.txt' files found in: {input_dir}", file=sys.stderr)
        return 1

    # Merge by draw_id. Existing website records are retained; legacy records
    # only fill dates that are not already present.
    merged = read_existing_csv(output_path)
    existing_count = len(merged)
    imported_count = 0
    duplicate_count = 0
    error_count = 0

    for txt_file in txt_files:
        rows, errors = parse_legacy_file(txt_file)
        error_count += len(errors)

        for row in rows:
            if row["draw_id"] in merged:
                duplicate_count += 1
                # Keep an existing row, especially its Powerball/source fields.
                continue
            merged[row["draw_id"]] = row
            imported_count += 1

        for error in errors:
            print(f"WARNING [{txt_file.name}] {error}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sorted_rows = sorted(
        merged.values(),
        key=lambda row: row.get("draw_date", "")
    )

    with output_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=CSV_FIELDS,
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(sorted_rows)

    print()
    print("Lotto TXT conversion completed.")
    print(f"Input folder:             {input_dir}")
    print(f"TXT files processed:      {len(txt_files)}")
    print(f"Rows already in CSV:      {existing_count}")
    print(f"New legacy rows added:    {imported_count}")
    print(f"Duplicate dates skipped:  {duplicate_count}")
    print(f"Invalid records:          {error_count}")
    print(f"Total rows in output:     {len(sorted_rows)}")
    print(f"Output CSV:               {output_path}")
    print()
    print("Note: Powerball is blank for legacy TXT records because those files")
    print("do not contain Powerball data.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
