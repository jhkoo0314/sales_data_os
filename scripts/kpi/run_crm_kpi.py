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
from modules.crm.service import build_crm_result_asset


def main() -> None:
    parser = argparse.ArgumentParser(description="Build CRM result asset")
    parser.add_argument("--company-key", required=True)
    args = parser.parse_args()
    print(json.dumps(build_crm_result_asset(args.company_key), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
