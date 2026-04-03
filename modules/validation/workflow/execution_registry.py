from __future__ import annotations


_EXECUTION_MODE_MODULES = {
    "integrated_full": ["crm", "prescription", "sandbox", "territory", "radar", "builder"],
}


def get_execution_mode_modules(execution_mode: str) -> list[str]:
    return list(_EXECUTION_MODE_MODULES.get(execution_mode, []))


def is_supported_execution_mode(execution_mode: str) -> bool:
    return execution_mode in _EXECUTION_MODE_MODULES
