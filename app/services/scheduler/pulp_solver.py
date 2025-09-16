from __future__ import annotations

from typing import Optional


def _import_pulp():  # pragma: no cover
    try:
        import pulp  # type: ignore
        return pulp
    except Exception:
        return None


def is_available() -> bool:
    return _import_pulp() is not None


# Placeholder for a future PuLP MILP model. For now we return None to fall back to greedy.
def solve_with_pulp(*args, **kwargs) -> Optional[dict]:
    pulp = _import_pulp()
    if pulp is None:
        return None
    # TODO: implement MILP model: variables x[c,r,t] only for allowed triples (forbidden-set)
    # objective: minimize seat slack + preference penalties; constraints: capacity, conflicts
    return None
