from __future__ import annotations

from fastapi import APIRouter

from ..services.scheduler.pulp_solver import is_available as pulp_available
from ..services.scheduler.ortools_solver import is_available as ort_available

router = APIRouter(prefix="/scheduler", tags=["scheduler"])


@router.get("/status")
def status():
    return {
        "greedy": True,
        "pulp": pulp_available(),
        "ortools": ort_available(),
    }

