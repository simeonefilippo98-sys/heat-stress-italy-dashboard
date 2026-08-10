from pathlib import Path
import gzip
import shutil

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
DATA.mkdir(parents=True, exist_ok=True)

# Files may be uploaded through the GitHub browser either into data/ or into
# the repository root. Normalize both layouts at runtime.
AUX_FILES = [
    "economic_geography_103_simplified.geojson",
    "ensemble_province_adaptation_losses.csv",
    "ensemble_national_adaptation_losses.csv",
    "ensemble_national_intensity_adaptation.csv",
]

for name in AUX_FILES:
    target = DATA / name
    root_source = BASE / name
    if not target.exists() and root_source.exists():
        shutil.copy2(root_source, target)

TARGET = DATA / "ATECO5_province_P1_P4_micro_results.csv.gz"
PART_NAMES = [
    "ATECO5_province_P1_P4_micro_results_part1.csv.gz",
    "ATECO5_province_P1_P4_micro_results_part2.csv.gz",
]

parts = []
for name in PART_NAMES:
    in_data = DATA / name
    in_root = BASE / name
    if in_data.exists():
        parts.append(in_data)
    elif in_root.exists():
        parts.append(in_root)
    else:
        raise FileNotFoundError(f"Missing dashboard data file: {name}")

# Reconstruct one valid gzipped CSV. Each uploaded part contains its own CSV
# header, so keep the header from part 1 and skip the first line of part 2.
if not TARGET.exists():
    with gzip.open(TARGET, "wt", encoding="utf-8", newline="") as dst:
        for i, part in enumerate(parts):
            with gzip.open(part, "rt", encoding="utf-8", newline="") as src:
                if i > 0:
                    next(src, None)
                shutil.copyfileobj(src, dst)

missing_aux = [name for name in AUX_FILES if not (DATA / name).exists()]
if missing_aux:
    raise FileNotFoundError(
        "Missing dashboard auxiliary file(s): " + ", ".join(missing_aux)
    )

import app  # noqa: E402,F401
