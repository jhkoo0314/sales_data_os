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
from modules.intake.merge import inspect_monthly_raw


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect monthly raw folders")
    parser.add_argument("--company-key", required=True)
    args = parser.parse_args()
    print(json.dumps(inspect_monthly_raw(args.company_key), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
