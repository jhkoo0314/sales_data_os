from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from scripts._shared.bootstrap import bootstrap_root

bootstrap_root()
from modules.intake.merge import inspect_monthly_raw, merge_monthly_raw_sources
from modules.intake.service import analyze_company_intake
from modules.normalization.service import normalize_all_sources


def main() -> None:
    summary = {
        "company_000002": {
            "intake": analyze_company_intake("company_000002"),
            "normalize": normalize_all_sources("company_000002"),
        },
        "monthly_merge_pharma": {
            "monthly_inspection": inspect_monthly_raw("monthly_merge_pharma"),
            "merge": merge_monthly_raw_sources("monthly_merge_pharma"),
            "intake": analyze_company_intake("monthly_merge_pharma"),
            "normalize": normalize_all_sources("monthly_merge_pharma"),
        },
        "daon_pharma": {
            "intake": analyze_company_intake("daon_pharma"),
        },
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
