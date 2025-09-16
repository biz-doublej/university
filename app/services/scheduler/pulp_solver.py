from __future__ import annotations

from typing import Optional

try:
    import pulp  # type: ignore
except Exception:  # pragma: no cover
    pulp = None  # type: ignore


def is_available() -> bool:
    return pulp is not None


# Placeholder for a future PuLP MILP model. For now we return None to fall back to greedy.
def solve_with_pulp(*args, **kwargs) -> Optional[dict]:
    if pulp is None:
        return None
    # TODO: implement MILP model: variables x[c,r,t] only for allowed triples (forbidden-set)
    # objective: minimize seat slack + preference penalties; constraints: capacity, conflicts
    return None

