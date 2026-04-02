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
from modules.intake.service import analyze_company_intake


def main() -> None:
    parser = argparse.ArgumentParser(description="Sales Data OS intake analyze")
    parser.add_argument("--company-key", required=True)
    parser.add_argument("--execution-mode", default="integrated_full")
    args = parser.parse_args()

    result = analyze_company_intake(
        company_key=args.company_key,
        execution_mode=args.execution_mode,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
