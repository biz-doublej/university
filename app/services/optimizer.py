from __future__ import annotations

import time
from typing import Literal, Optional

from sqlalchemy import select

from .jobs import queue
from ..db import SessionLocal
from ..models import Tenant, Room, Timeslot, Course
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
        try:
            # Use default tenant (first enabled) for MVP
            with SessionLocal() as db:
                if tenant_id is not None:
                    tenant = db.get(Tenant, tenant_id)
                else:
                    tenant = db.execute(select(Tenant).where(Tenant.enabled == True)).scalars().first()  # noqa: E712
                if tenant is None:
                    tenant = Tenant(name="demo", enabled=True, locale="ko", timezone="Asia/Seoul")
                    db.add(tenant)
                    db.commit()
                    db.refresh(tenant)

                _ensure_seed_data(db, tenant)

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
                    # If nothing assigned because of strict forbidden-set, retry ignoring forbidden to surface a plan
                    if stats.get("assigned_courses", 0) == 0 and forbid_checks:
                        assignments, stats = warm_start_greedy(db, tenant.id, group_size=slot_group, use_forbidden=False)
                        used_solver = f"{used_solver}+relaxed"
                    persist_assignments(db, tenant.id, assignments)
                    score = _score_from_stats(stats)
                    elapsed = time.time() - started
                    explain = (
                        f"{used_solver} scheduled {stats['assigned_courses']}/{stats['total_courses']} courses "
                        f"into {stats['assignment_count']} blocks in {elapsed:.2f}s (policy v{policy_version}, week {week})."
                    )
                    queue.update(job_id, status="completed", score=score, explain=explain)
                    return
        except Exception as exc:
            queue.update(job_id, status="failed", explain=f"{type(exc).__name__}: {exc}")
            return

    job = queue.create(_worker)
    return job.id


def _score_from_stats(stats: dict) -> float:
    total = max(1, stats.get("total_courses", 1))
    assigned = stats.get("assigned_courses", 0)
    # Simple ratio as score baseline
    return round(assigned / total, 4)


def _ensure_seed_data(db: SessionLocal, tenant: Tenant) -> None:
    # Seed fixed dataset if present (rooms/courses/timeslots)
    try:
        # Local import to avoid circular dependency at module load
        from .fixed_seed import ensure_fixed_dataset  # type: ignore

        ensure_fixed_dataset(db, tenant)
    except Exception:
        # If seeding fails, continue with minimal scaffolding below
        pass

    # Minimal safety net: create default rooms if none
    room_count = db.query(Room).filter(Room.tenant_id == tenant.id).count()
    if room_count == 0:
        # 창조관 빌딩을 기본으로 여러 강의실/실습실 생성
        labs = [("창조관 Lab401", 32), ("창조관 Lab402", 28)]
        classes = [
            ("창조관 R101", 30),
            ("창조관 R102", 40),
            ("창조관 R201", 24),
            ("창조관 R202", 36),
            ("창조관 R301", 32),
        ]
        for name, cap in labs:
            db.add(Room(tenant_id=tenant.id, name=name, type="lab", capacity=cap, building="창조관"))
        for name, cap in classes:
            db.add(Room(tenant_id=tenant.id, name=name, type="classroom", capacity=cap, building="창조관"))
        room_count = len(labs) + len(classes)

    # Minimal safety net: create weekday hourly slots if none or invalid
    ts_rows = db.query(Timeslot).filter(Timeslot.tenant_id == tenant.id).all()
    if not _has_valid_slots(ts_rows):
        db.query(Timeslot).filter(Timeslot.tenant_id == tenant.id).delete()
        days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
        for d in days:
            for h in range(9, 18):
                start = f"{h:02d}:00"
                end = f"{h+1:02d}:00"
                db.add(Timeslot(tenant_id=tenant.id, day=d, start=start, end=end, granularity=60))
    # Minimal safety net: create demo courses if none
    course_count = db.query(Course).filter(Course.tenant_id == tenant.id).count()
    if course_count == 0:
        sample = [
            ("NUR201", "기본간호실습", True, 28, "간호학과", "2-A"),
            ("CS101", "컴퓨팅사고와코딩", False, 40, "컴퓨터공학과", "1-A"),
            ("ME201", "기계공작실습", True, 24, "기계공학과", "2-B"),
        ]
        for code, name, needs_lab, expected, dept, cohort in sample:
            db.add(
                Course(
                    tenant_id=tenant.id,
                    code=code,
                    name=name,
                    hours_per_week=3,
                    needs_lab=needs_lab,
                    expected_enrollment=expected,
                    department=dept,
                    cohort=cohort,
                )
            )
    db.commit()


def _has_valid_slots(slots: list[Timeslot]) -> bool:
    from .scheduler.calendar_rules import normalize_slot

    for s in slots:
        if normalize_slot(s.day, s.start, s.end) is not None:
            return True
    return False
