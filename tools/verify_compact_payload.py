#!/usr/bin/env python3
"""Verify that the compact browser payload reproduces every source row."""

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
PAYLOAD = ROOT / "micro_compact_v1.json.gz"

NUMERIC_FIELDS = (
    "outdoor_share_main",
    "VA_allocated_EUR",
    "addetti",
    "loss_outdoor_only",
    "VA_loss_EUR_mixed_main",
    "workers_lost_mixed_main",
    "VA_loss_EUR_combined_adapt_50",
    "workers_lost_combined_adapt_50",
    "VA_avoided_EUR_combined_adapt_50",
    "VA_loss_EUR_combined_adapt_75",
    "workers_lost_combined_adapt_75",
    "VA_avoided_EUR_combined_adapt_75",
)


def number(value: str) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0
    return parsed if math.isfinite(parsed) else 0.0


def main() -> None:
    with gzip.open(PAYLOAD, "rt", encoding="utf-8") as handle:
        payload = json.load(handle)

    codebooks = payload["codebooks"]
    rows = payload["rows"]
    row_index = 0

    for source in SOURCES:
        with gzip.open(source, "rt", encoding="utf-8", newline="") as handle:
            for source_row in csv.DictReader(handle):
                compact = rows[row_index]
                decoded = (
                    tuple(codebooks["periods"][compact[0]]),
                    tuple(codebooks["provinces"][compact[1]]),
                    tuple(codebooks["activities"][compact[2]]),
                    tuple(codebooks["branches"][compact[3]]),
                    codebooks["work_intensities"][compact[4]],
                )
                expected = (
                    (source_row["period_id"], source_row["period_label"]),
                    (source_row["REF_AREA"], source_row["province_name"]),
                    (
                        source_row["sector_code"].zfill(5),
                        source_row["sector_description"],
                    ),
                    (source_row["VA_BRANCH_11"], source_row["VA_BRANCH_11_DESC"]),
                    source_row["work_intensity"],
                )
                if decoded != expected:
                    raise AssertionError(
                        f"Codebook mismatch at row {row_index}: {decoded!r} != {expected!r}"
                    )

                for offset, field in enumerate(NUMERIC_FIELDS, start=5):
                    if not math.isclose(
                        compact[offset], number(source_row[field]), rel_tol=0.0, abs_tol=1e-9
                    ):
                        raise AssertionError(
                            f"Numeric mismatch at row {row_index}, field {field}"
                        )
                row_index += 1

    if row_index != len(rows):
        raise AssertionError(f"Row count mismatch: verified {row_index}, payload has {len(rows)}")

    print(
        json.dumps(
            {
                "status": "ok",
                "rows_verified": row_index,
                "payload_version": payload["version"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
