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
from modules.normalization.service import normalize_sandbox_sources


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize sandbox source")
    parser.add_argument("--company-key", required=True)
    args = parser.parse_args()
    print(json.dumps(normalize_sandbox_sources(args.company_key), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
