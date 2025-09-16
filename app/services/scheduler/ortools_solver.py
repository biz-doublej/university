from __future__ import annotations

from typing import Optional

try:
    # Lazy import names to check availability without importing heavy modules if missing
    from ortools.sat.python import cp_model  # type: ignore
except Exception:  # pragma: no cover
    cp_model = None  # type: ignore


def is_available() -> bool:
    return cp_model is not None


def solve_with_ortools(*args, **kwargs) -> Optional[dict]:
    if cp_model is None:
        return None
    # TODO: Implement CP-SAT model: boolean x[c,r,b] for allowed triples; no-overlap constraints; objective weights
    return None

