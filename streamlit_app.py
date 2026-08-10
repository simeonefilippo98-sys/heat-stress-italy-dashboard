from pathlib import Path
import shutil

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
TARGET = DATA / "ATECO5_province_P1_P4_micro_results.csv.gz"
PARTS = [
    DATA / "ATECO5_province_P1_P4_micro_results_part1.csv.gz",
    DATA / "ATECO5_province_P1_P4_micro_results_part2.csv.gz",
]

# GitHub's browser upload has a per-file size limit. The archived microdataset
# is therefore stored in two independently gzipped CSV parts. At runtime we
# reconstruct a concatenated multi-member gzip stream, which Python/pandas can
# read transparently as the original table.
if not TARGET.exists():
    missing = [str(p.name) for p in PARTS if not p.exists()]
    if missing:
        raise FileNotFoundError(
            "Missing dashboard data file(s): " + ", ".join(missing)
        )
    DATA.mkdir(parents=True, exist_ok=True)
    with TARGET.open("wb") as dst:
        for part in PARTS:
            with part.open("rb") as src:
                shutil.copyfileobj(src, dst)

import app  # noqa: E402,F401
