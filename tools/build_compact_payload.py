#!/usr/bin/env python3
"""Build the compact browser payload from the two validated ATECO5 CSV archives.

The source archives remain the scientific source of truth. This script only changes
their transport representation: repeated strings are stored once in codebooks and
rows contain integer references plus the numeric fields used by the dashboard.
"""

from __future__ import annotations

import csv
import gzip
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCES = (
    ROOT / "ATECO5_province_P1_P4_micro_results_part1.csv.gz",
    ROOT / "ATECO5_province_P1_P4_micro_results_part2.csv.gz",
)
OUTPUT = ROOT / "micro_compact_v1.json.gz"


class Codebook:
    def __init__(self) -> None:
        self.values: list = []
        self.indices: dict = {}

    def add(self, value):
        if value not in self.indices:
            self.indices[value] = len(self.values)
            self.values.append(value)
        return self.indices[value]


def number(value: str) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0
    return parsed if math.isfinite(parsed) else 0.0


def main() -> None:
    provinces = Codebook()
    activities = Codebook()
    branches = Codebook()
    intensities = Codebook()
    periods = Codebook()
    rows: list[list] = []

    for source in SOURCES:
        with gzip.open(source, "rt", encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            for item in reader:
                province_index = provinces.add(
                    (str(item["REF_AREA"]), str(item["province_name"]))
                )
                activity_index = activities.add(
                    (
                        str(item["sector_code"]).zfill(5),
                        str(item["sector_description"]),
                    )
                )
                branch_index = branches.add(
                    (str(item["VA_BRANCH_11"]), str(item["VA_BRANCH_11_DESC"]))
                )
                intensity_index = intensities.add(str(item["work_intensity"]))
                period_index = periods.add(
                    (str(item["period_id"]), str(item["period_label"]))
                )
                rows.append(
                    [
                        period_index,
                        province_index,
                        activity_index,
                        branch_index,
                        intensity_index,
                        number(item["outdoor_share_main"]),
                        number(item["VA_allocated_EUR"]),
                        number(item["addetti"]),
                        number(item["loss_outdoor_only"]),
                        number(item["VA_loss_EUR_mixed_main"]),
                        number(item["workers_lost_mixed_main"]),
                        number(item["VA_loss_EUR_combined_adapt_50"]),
                        number(item["workers_lost_combined_adapt_50"]),
                        number(item["VA_avoided_EUR_combined_adapt_50"]),
                        number(item["VA_loss_EUR_combined_adapt_75"]),
                        number(item["workers_lost_combined_adapt_75"]),
                        number(item["VA_avoided_EUR_combined_adapt_75"]),
                    ]
                )

    payload = {
        "version": 1,
        "schema": [
            "period",
            "province",
            "activity",
            "branch",
            "work_intensity",
            "outdoor_share",
            "value_added_eur",
            "workers",
            "loss_outdoor_only",
            "va_loss_no_adaptation",
            "workers_lost_no_adaptation",
            "va_loss_adaptation_50",
            "workers_lost_adaptation_50",
            "va_avoided_adaptation_50",
            "va_loss_adaptation_75",
            "workers_lost_adaptation_75",
            "va_avoided_adaptation_75",
        ],
        "codebooks": {
            "periods": periods.values,
            "provinces": provinces.values,
            "activities": activities.values,
            "branches": branches.values,
            "work_intensities": intensities.values,
        },
        "rows": rows,
    }

    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    with gzip.open(temporary, "wt", encoding="utf-8", compresslevel=9) as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
    temporary.replace(OUTPUT)

    print(
        json.dumps(
            {
                "output": str(OUTPUT),
                "rows": len(rows),
                "periods": len(periods.values),
                "provinces": len(provinces.values),
                "activities": len(activities.values),
                "branches": len(branches.values),
                "compressed_bytes": OUTPUT.stat().st_size,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
