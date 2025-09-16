from __future__ import annotations

from typing import Optional


def _import_cp_model():  # pragma: no cover
    try:
        from ortools.sat.python import cp_model  # type: ignore
        return cp_model
    except Exception:
        return None


def is_available() -> bool:
    return _import_cp_model() is not None


def solve_with_ortools(*args, **kwargs) -> Optional[dict]:
    cp_model = _import_cp_model()
    if cp_model is None:
        return None
    # TODO: Implement CP-SAT model: boolean x[c,r,b] for allowed triples; no-overlap constraints; objective weights
    return None
