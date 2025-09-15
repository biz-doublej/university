from __future__ import annotations

from fastapi import APIRouter, Path
from ..schemas import AssignmentPatch

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.patch("/{assignment_id}")
def patch_assignment(
    assignment_id: int = Path(...),
    patch: AssignmentPatch | None = None,
):
    # Placeholder for base scaffold
    return {"id": assignment_id, "patched": True, "payload": patch.model_dump() if patch else {}}

