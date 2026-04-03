from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workers.services.run_executor import build_execution_payload


def test_build_execution_payload_rejects_unsupported_mode():
    with pytest.raises(ValueError, match="지원하지 않는 execution_mode"):
        build_execution_payload(
            {
                "id": "db-1",
                "company_key": "daon_pharma",
                "execution_mode": "unknown_mode",
            },
            "db-1",
        )


def test_build_execution_payload_defaults_to_integrated_full():
    payload = build_execution_payload(
        {
            "id": "db-2",
            "company_key": "daon_pharma",
        },
        "db-2",
    )
    assert payload.execution_mode == "integrated_full"
