from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from scripts._shared.bootstrap import bootstrap_root

bootstrap_root()
from modules.intake.merge import merge_monthly_raw_sources


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge monthly raw sources")
    parser.add_argument("--company-key", required=True)
    args = parser.parse_args()
    result = merge_monthly_raw_sources(args.company_key)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
