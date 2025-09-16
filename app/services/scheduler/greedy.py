from __future__ import annotations

from typing import Dict, List, Tuple

from sqlalchemy.orm import Session

from ...models import Course, Room, Timeslot, Assignment
from .types import CourseLite, RoomLite, SlotLite, AssignmentLite
from .filters import filter_rooms_for_course
from .grouping import group_slots


def _load_lite(db: Session, tenant_id: int) -> tuple[list[CourseLite], list[RoomLite], list[SlotLite]]:
    courses = [
        CourseLite(
            id=c.id,
            tenant_id=c.tenant_id,
            code=c.code,
            name=c.name,
            hours_per_week=c.hours_per_week,
            needs_lab=c.needs_lab,
            expected_enrollment=c.expected_enrollment,
        )
        for c in db.query(Course).filter(Course.tenant_id == tenant_id).all()
    ]
    rooms = [
        RoomLite(
            id=r.id,
            tenant_id=r.tenant_id,
            name=r.name,
            type=r.type,
            capacity=r.capacity,
            building=r.building,
        )
        for r in db.query(Room).filter(Room.tenant_id == tenant_id).all()
    ]
    slots = [
        SlotLite(
            id=s.id,
            tenant_id=s.tenant_id,
            day=s.day,
            start=s.start,
            end=s.end,
            granularity=s.granularity,
        )
        for s in db.query(Timeslot).filter(Timeslot.tenant_id == tenant_id).all()
    ]
    return courses, rooms, slots


def warm_start_greedy(
    db: Session,
    tenant_id: int,
    *,
    group_size: int = 1,
    use_forbidden: bool = True,
) -> tuple[list[AssignmentLite], dict]:
    courses, rooms, slots = _load_lite(db, tenant_id)
    # Sort courses: larger enrollment first, and lab first
    courses.sort(key=lambda c: (not c.needs_lab, -c.expected_enrollment))

    # Generate grouped slot blocks
    slot_blocks = group_slots(slots, group_size)

    # Track availability
    room_day_block_used: Dict[Tuple[int, Tuple[int, ...]], bool] = {}
    course_assigned: Dict[int, bool] = {}
    out: list[AssignmentLite] = []

    for course in courses:
        # Each course may require multiple hours per week; we assign one block per hour unit.
        remaining = max(1, course.hours_per_week // max(1, (slots[0].granularity if slots else 60) // 60))
        allowed_rooms = filter_rooms_for_course(course, rooms) if use_forbidden else rooms
        # Prefer rooms: lab then by capacity ascending (tight fit)
        allowed_rooms = sorted(
            allowed_rooms,
            key=lambda r: (r.type != ("lab" if course.needs_lab else r.type), r.capacity),
        )

        assigned_blocks = 0
        for room in allowed_rooms:
            if assigned_blocks >= remaining:
                break
            for block in slot_blocks:
                key = (room.id, tuple(block))
                if room_day_block_used.get(key):
                    continue
                # Assign this block to course
                out.append(AssignmentLite(course_id=course.id, room_id=room.id, slot_ids=list(block)))
                room_day_block_used[key] = True
                assigned_blocks += 1
                if assigned_blocks >= remaining:
                    break
        course_assigned[course.id] = assigned_blocks > 0

    stats = {
        "total_courses": len(courses),
        "assigned_courses": sum(1 for v in course_assigned.values() if v),
        "assignment_count": len(out),
    }
    return out, stats


def persist_assignments(db: Session, tenant_id: int, assignments: list[AssignmentLite]) -> None:
    # Simple persistence: clear existing auto assignments
    db.query(Assignment).filter(Assignment.tenant_id == tenant_id).delete()
    for a in assignments:
        # For now, store only the first slot id (placeholder); could expand to link to multiple
        timeslot_id = a.slot_ids[0] if a.slot_ids else None
        db.add(
            Assignment(
                tenant_id=tenant_id,
                course_id=a.course_id,
                room_id=a.room_id,
                timeslot_id=timeslot_id,
                status="auto",
                reason="warm_start_greedy",
            )
        )
    db.commit()

