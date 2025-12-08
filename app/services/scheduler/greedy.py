from __future__ import annotations

from typing import Dict, Tuple
import random

from sqlalchemy.orm import Session

from ...models import Course, Room, Timeslot, Assignment
from .types import CourseLite, RoomLite, SlotLite, AssignmentLite
from .filters import filter_rooms_for_course
from .grouping import group_slots
from .calendar_rules import normalize_slot


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
    slots: list[SlotLite] = []
    seen_day_period: set[tuple[str, int]] = set()
    for s in db.query(Timeslot).filter(Timeslot.tenant_id == tenant_id).all():
        window = normalize_slot(s.day, s.start, s.end)
        if window is None:
            continue
        key = (window.day, window.period)
        if key in seen_day_period:
            continue
        seen_day_period.add(key)
        slots.append(
            SlotLite(
                id=s.id,
                tenant_id=s.tenant_id,
                day=window.day,
                start=window.start,
                end=window.end,
                granularity=s.granularity,
                period=window.period,
            )
        )
    return courses, rooms, slots


def warm_start_greedy(
    db: Session,
    tenant_id: int,
    *,
    group_size: int = 1,
    use_forbidden: bool = True,
) -> tuple[list[AssignmentLite], dict]:
    courses, rooms, slots = _load_lite(db, tenant_id)
    slot_lookup = {s.id: s for s in slots}
    rng = random.Random(tenant_id)
    # Sort courses: larger enrollment first, and lab first
    courses.sort(key=lambda c: (not c.needs_lab, -c.expected_enrollment))

    # Generate grouped slot blocks
    slot_blocks = group_slots(slots, group_size)
    rng.shuffle(slot_blocks)
    if not slots or not slot_blocks:
        stats = {
            "total_courses": len(courses),
            "assigned_courses": 0,
            "assignment_count": 0,
            "note": "no_valid_slots",
        }
        return [], stats

    # Track availability
    room_day_block_used: Dict[Tuple[int, Tuple[int, ...]], bool] = {}
    room_slot_used: Dict[int, set[int]] = {}
    course_assigned: Dict[int, bool] = {}
    out: list[AssignmentLite] = []

    for course in courses:
        # Each course may require multiple hours per week; we assign one block per hour unit.
        hours_required = max(1, course.hours_per_week)
        blocks_needed = max(1, (hours_required + group_size - 1) // group_size)
        allowed_rooms = filter_rooms_for_course(course, rooms) if use_forbidden else rooms
        # Department-specific constraint: 빅데이터과는 창조관만 사용
        if course.department and course.department.strip() == "빅데이터과":
            allowed_rooms = [
                r for r in allowed_rooms if "창조관" in (r.building or "").strip()
            ]
            # If none, relax to 모든 창조관 강의실(초기 시드 포함)
            if not allowed_rooms:
                allowed_rooms = [r for r in rooms if "창조관" in (r.building or "").strip()]
        # Prefer rooms: lab first, then tight capacity fit, random tie-breaker for 다양성
        allowed_rooms = sorted(
            allowed_rooms,
            key=lambda r: (
                r.type != ("lab" if course.needs_lab else r.type),
                r.capacity,
                rng.random(),
            ),
        )

        assigned_blocks = 0
        for room in allowed_rooms:
            if assigned_blocks >= blocks_needed:
                break
            # Pick the best block for this room: minimize wasted seats and prefer earlier periods
            best_block = None
            best_score = None
            for block in slot_blocks:
                key = (room.id, tuple(block))
                if room_day_block_used.get(key):
                    continue
                # Prevent slot-level overlaps per room
                if any(slot_id in room_slot_used.get(room.id, set()) for slot_id in block):
                    continue
                # Compute slack-based score (lower is better)
                slack = max(0, room.capacity - course.expected_enrollment)
                start_period = slot_lookup[block[0]].period if block and block[0] in slot_lookup else 0
                score = (slack, start_period)
                if best_score is None or score < best_score:
                    best_score = score
                    best_block = block
            if best_block:
                out.append(AssignmentLite(course_id=course.id, room_id=room.id, slot_ids=list(best_block)))
                room_day_block_used[(room.id, tuple(best_block))] = True
                room_slot_used.setdefault(room.id, set()).update(best_block)
                assigned_blocks += 1
                if assigned_blocks >= blocks_needed:
                    break
        course_assigned[course.id] = assigned_blocks > 0

    stats = {
        "total_courses": len(courses),
        "assigned_courses": sum(1 for v in course_assigned.values() if v),
        "assignment_count": len(out),
    }
    return out, stats


def persist_assignments(db: Session, tenant_id: int, assignments: list[AssignmentLite]) -> None:
    # Clear existing auto assignments before writing a fresh plan
    db.query(Assignment).filter(Assignment.tenant_id == tenant_id, Assignment.status == "auto").delete()
    for a in assignments:
        # Store every timeslot in the block so 공실/중복 검증이 정확해진다.
        slot_ids = a.slot_ids or [None]
        for idx, slot_id in enumerate(slot_ids, start=1):
            db.add(
                Assignment(
                    tenant_id=tenant_id,
                    course_id=a.course_id,
                    room_id=a.room_id,
                    timeslot_id=slot_id,
                    status="auto",
                    reason=f"warm_start_greedy_block{idx}",
                )
            )
    db.commit()
