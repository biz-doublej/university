from __future__ import annotations

from fastapi import APIRouter

from ..schemas import OptimizeRequest, OptimizeStatus
from ..services.jobs import queue
from ..services.optimizer import submit_optimize_job

router = APIRouter(prefix="/optimize", tags=["optimize"])


@router.post("", response_model=OptimizeStatus)
def optimize(req: OptimizeRequest) -> OptimizeStatus:
    job_id = submit_optimize_job(
        req.policy_version,
        req.week,
        solver=(req.solver or "greedy"),
        slot_group=(req.slot_group or 1),
        forbid_checks=(req.forbid_checks if req.forbid_checks is not None else True),
    )
    return OptimizeStatus(job_id=job_id, status="queued", solver=req.solver or "greedy")


@router.get("/{job_id}", response_model=OptimizeStatus)
def optimize_status(job_id: str) -> OptimizeStatus:
    job = queue.get(job_id)
    if job is None:
        return OptimizeStatus(job_id=job_id, status="not_found")
    return OptimizeStatus(job_id=job.id, status=job.status, score=job.score, explain=job.explain)
