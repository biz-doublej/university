from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from .scheduler.greedy import warm_start_greedy, persist_assignments


def recommend_timetable_for_student(db: Session, student_id: int, max_courses: int = 6, preferences: dict[str, Any] | None = None):
    """Generate a timetable recommendation for a tenant using greedy warm start.
    This function currently ignores per-student fine-grained constraints and returns a global timetable
    that can be post-filtered by student enrollment selection. For a fully personalized timetable we'd
    need to incorporate student-specific constraints into the scheduler.
    """
    # Determine tenant_id via student relation
    from ..models import Student

    student = db.get(Student, student_id)
    if student is None:
        raise ValueError("student_not_found")

    tenant_id = student.tenant_id

    # Warm start greedy assignment for tenant
    assignments, stats = warm_start_greedy(db, tenant_id, group_size=preferences.get('slot_group', 1) if preferences else 1, use_forbidden=not preferences.get('ignore_forbidden', False) if preferences else True)

    # Persist is optional; we return proposals without saving by default
    # persist_assignments(db, tenant_id, assignments)

    # Transform assignments into simple timetable rows
    rows = []
    for a in assignments[: max_courses * 2]:  # limit returned rows
        rows.append({
            'course_id': a.course_id,
            'room_id': a.room_id,
            'slot_ids': a.slot_ids,
        })

    return {'timetable': rows, 'stats': stats}
