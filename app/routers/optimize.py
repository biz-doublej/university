from __future__ import annotations

from fastapi import APIRouter, Header, Depends
from sqlalchemy.orm import Session

from ..schemas import OptimizeRequest, OptimizeStatus
from ..services.jobs import queue
from ..services.optimizer import submit_optimize_job
from ..db import get_db
from ..services.auth import verify_api_key

router = APIRouter(prefix="/optimize", tags=["optimize"])


@router.post("", response_model=OptimizeStatus)
def optimize(
    req: OptimizeRequest,
    x_api_key: str | None = Header(default=None, convert_underscores=False, alias="X-API-Key"),
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> OptimizeStatus:
    tenant_id: int | None = None
    token = x_api_key or authorization or None
    if token:
        k = verify_api_key(db, token)
        if k:
            tenant_id = k.tenant_id
    job_id = submit_optimize_job(
        req.policy_version,
        req.week,
        solver=(req.solver or "greedy"),
        slot_group=(req.slot_group or 1),
        forbid_checks=(req.forbid_checks if req.forbid_checks is not None else True),
        tenant_id=tenant_id,
    )
    return OptimizeStatus(job_id=job_id, status="queued", solver=req.solver or "greedy")


@router.get("/{job_id}", response_model=OptimizeStatus)
def optimize_status(job_id: str) -> OptimizeStatus:
    job = queue.get(job_id)
    if job is None:
        return OptimizeStatus(job_id=job_id, status="not_found")
    return OptimizeStatus(job_id=job.id, status=job.status, score=job.score, explain=job.explain)
