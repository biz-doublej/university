from __future__ import annotations

import time
from typing import Literal, Optional

from sqlalchemy import select

from .jobs import queue
from ..db import SessionLocal
from ..models import Tenant
from .scheduler.greedy import warm_start_greedy, persist_assignments
from .scheduler.pulp_solver import is_available as pulp_available, solve_with_pulp
from .scheduler.ortools_solver import is_available as ort_available, solve_with_ortools


def submit_optimize_job(
    policy_version: int,
    week: str,
    *,
    solver: Literal["greedy", "pulp", "ortools"] = "greedy",
    slot_group: int = 1,
    forbid_checks: bool = True,
    tenant_id: Optional[int] = None,
) -> str:
    def _worker(job_id: str) -> None:
        queue.update(job_id, status="running")
        started = time.time()
        # Use default tenant (first enabled) for MVP
        with SessionLocal() as db:
            if tenant_id is not None:
                tenant = db.get(Tenant, tenant_id)
            else:
                tenant = db.execute(select(Tenant).where(Tenant.enabled == True)).scalars().first()  # noqa: E712
            if tenant is None:
                queue.update(job_id, status="failed", explain="No tenant found")
                return

            # Branch by solver
            used_solver = solver
            result = None

            if solver == "pulp" and pulp_available():
                result = solve_with_pulp()
                # If not implemented, fall back
                if result is None:
                    used_solver = "greedy"

            if solver == "ortools" and ort_available():
                result = solve_with_ortools()
                if result is None:
                    used_solver = "greedy"

            if result is None:  # greedy fallback or explicit
                assignments, stats = warm_start_greedy(db, tenant.id, group_size=slot_group, use_forbidden=forbid_checks)
                persist_assignments(db, tenant.id, assignments)
                score = _score_from_stats(stats)
                elapsed = time.time() - started
                explain = (
                    f"{used_solver} scheduled {stats['assigned_courses']}/{stats['total_courses']} courses "
                    f"into {stats['assignment_count']} blocks in {elapsed:.2f}s (policy v{policy_version}, week {week})."
                )
                queue.update(job_id, status="completed", score=score, explain=explain)
                return

    job = queue.create(_worker)
    return job.id


def _score_from_stats(stats: dict) -> float:
    total = max(1, stats.get("total_courses", 1))
    assigned = stats.get("assigned_courses", 0)
    # Simple ratio as score baseline
    return round(assigned / total, 4)
