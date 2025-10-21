from __future__ import annotations

import re
from typing import Any, Iterable

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import Course, CourseReview, Room, Student, Timeslot
from .scheduler.calendar_rules import ALLOWED_DAYS, day_display, normalize_day, normalize_slot
from .scheduler.greedy import warm_start_greedy
from .scheduler.types import AssignmentLite


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return [item for item in value if item not in (None, "")]
    if isinstance(value, str):
        if "," in value:
            return [item.strip() for item in value.split(",") if item.strip()]
        stripped = value.strip()
        return [stripped] if stripped else []
    return [value]


def _resolve_preferred_course_ids(db: Session, tenant_id: int, raw_items: Iterable[Any]) -> set[int]:
    preferred_ids: set[int] = set()
    preferred_codes: set[str] = set()
    for item in raw_items:
        if isinstance(item, int):
            preferred_ids.add(item)
        elif isinstance(item, str):
            token = item.strip()
            if not token:
                continue
            if token.isdigit():
                preferred_ids.add(int(token))
            else:
                preferred_codes.add(token.upper())

    if preferred_codes:
        rows = (
            db.query(Course.id, Course.code)
            .filter(Course.tenant_id == tenant_id)
            .all()
        )
        code_to_id = {code.upper(): course_id for course_id, code in rows if code}
        for code in preferred_codes:
            course_id = code_to_id.get(code.upper())
            if course_id is not None:
                preferred_ids.add(course_id)

    return preferred_ids


def _select_assignments(
    assignments: Iterable[AssignmentLite],
    slot_catalog: dict[int, dict[str, Any]],
    *,
    course_filter: set[int] | None,
    max_courses: int,
    avoid_days: set[str],
    avoid_periods: set[int],
):
    selected: list[tuple[AssignmentLite, list[tuple[int, dict[str, Any]]]]] = []
    used_slots: set[tuple[str, int]] = set()

    for assignment in assignments:
        if course_filter and assignment.course_id not in course_filter:
            continue

        slot_infos: list[tuple[int, dict[str, Any]]] = []
        conflict = False
        for slot_id in assignment.slot_ids:
            info = slot_catalog.get(slot_id)
            if info is None:
                conflict = True
                break
            if info["day"] in avoid_days or info["period"] in avoid_periods:
                conflict = True
                break
            key = (info["day"], info["period"])
            if key in used_slots:
                conflict = True
                break
            slot_infos.append((slot_id, info))

        if conflict or not slot_infos:
            continue

        selected.append((assignment, slot_infos))
        for _, info in slot_infos:
            used_slots.add((info["day"], info["period"]))

        if len(selected) >= max_courses:
            break

    return selected


def _infer_department_label(course_meta: dict[str, Any], student: Student) -> str:
    cohort = str(course_meta.get("cohort") or "").strip()
    if cohort:
        return cohort
    if student.major:
        return student.major
    return "미분류"


def _infer_year_label(course_meta: dict[str, Any], student: Student) -> str:
    cohort = str(course_meta.get("cohort") or "")
    match = re.search(r"(\d{1,2})", cohort)
    if match:
        try:
            year = int(match.group(1))
            if 1 <= year <= 6:
                return f"{year}학년"
        except ValueError:
            pass
    if student.year:
        return f"{student.year}학년"
    return "미분류"


def _group_by(
    rows: list[dict[str, Any]],
    *,
    key: str,
) -> list[dict[str, Any]]:
    groups: dict[str, dict[str, Any]] = {}
    for row in rows:
        grouping = row.get("grouping", {})
        label = grouping.get(key) or "미분류"
        entry = groups.setdefault(
            label,
            {
                "label": label,
                "course_count": 0,
                "slot_count": 0,
                "courses": [],
            },
        )
        entry["course_count"] += 1
        entry["slot_count"] += len(row.get("slots", []))
        entry["courses"].append(
            {
                "course": row.get("course"),
                "room": row.get("room"),
                "slots": row.get("slots", []),
            }
        )
    for entry in groups.values():
        entry["slot_hours"] = entry["slot_count"]  # 슬롯 1개=1시간 기준
    return sorted(groups.values(), key=lambda item: item["course_count"], reverse=True)


def recommend_timetable_for_student(
    db: Session,
    student_id: int,
    max_courses: int = 6,
    preferences: dict[str, Any] | None = None,
):
    """Return a conflict-free timetable recommendation for a student.

    Rules applied:
    - only Monday–Friday slots are considered (09:00~18:00, 9 교시 기준)
    - one course per period for the student; overlaps are skipped automatically
    - preferences can limit courses/days/periods and are honoured when possible
    """

    preferences = preferences or {}

    student = db.get(Student, student_id)
    if student is None:
        raise ValueError("student_not_found")

    tenant_id = student.tenant_id

    group_size = int(preferences.get("slot_group", 1) or 1)
    ignore_forbidden = bool(preferences.get("ignore_forbidden", False))

    preferred_max = preferences.get("max_courses")
    if preferred_max is not None:
        try:
            max_courses = int(preferred_max)
        except (TypeError, ValueError):
            pass

    assignments, stats = warm_start_greedy(
        db,
        tenant_id,
        group_size=group_size,
        use_forbidden=not ignore_forbidden,
    )

    # Build slot catalog restricted to Monday–Friday 09:00~18:00 (9교시)
    slot_catalog: dict[int, dict[str, Any]] = {}
    for slot in db.query(Timeslot).filter(Timeslot.tenant_id == tenant_id).all():
        window = normalize_slot(slot.day, slot.start, slot.end)
        if window is None:
            continue
        slot_catalog[slot.id] = {
            "day": window.day,
            "day_display": day_display(window.day),
            "period": window.period,
            "start": window.start,
            "end": window.end,
            "label": window.label,
        }

    preferred_ids = _resolve_preferred_course_ids(
        db, tenant_id, _as_list(preferences.get("preferred_courses"))
    )

    avoid_days = {
        normalized
        for normalized in (
            normalize_day(str(item)) for item in _as_list(preferences.get("avoid_days"))
        )
        if normalized is not None
    }
    avoid_periods = {
        int(item)
        for item in _as_list(preferences.get("avoid_periods"))
        if isinstance(item, int) or (isinstance(item, str) and item.isdigit())
    }

    max_courses = max(1, min(int(max_courses or 1), 9))

    selected = _select_assignments(
        assignments,
        slot_catalog,
        course_filter=preferred_ids if preferred_ids else None,
        max_courses=max_courses,
        avoid_days=avoid_days,
        avoid_periods=avoid_periods,
    )

    if not selected and preferred_ids:
        # Fallback: ignore course filter if strict filtering produced nothing
        selected = _select_assignments(
            assignments,
            slot_catalog,
            course_filter=None,
            max_courses=max_courses,
            avoid_days=avoid_days,
            avoid_periods=avoid_periods,
        )

    course_ids = {assignment.course_id for assignment, _ in selected}
    room_ids = {assignment.room_id for assignment, _ in selected if assignment.room_id is not None}

    course_rows = (
        db.query(Course)
        .filter(Course.id.in_(course_ids))
        .all()
        if course_ids
        else []
    )
    room_rows = (
        db.query(Room)
        .filter(Room.id.in_(room_ids))
        .all()
        if room_ids
        else []
    )

    course_map = {
        course.id: {
            "id": course.id,
            "code": course.code,
            "name": course.name,
            "hours_per_week": course.hours_per_week,
            "expected_enrollment": course.expected_enrollment,
            "needs_lab": course.needs_lab,
            "cohort": course.cohort,
        }
        for course in course_rows
    }
    room_map = {
        room.id: {
            "id": room.id,
            "name": room.name,
            "type": room.type,
            "capacity": room.capacity,
            "building": room.building,
        }
        for room in room_rows
    }

    review_map: dict[int, dict[str, Any]] = {}
    if course_ids:
        review_rows = (
            db.query(
                CourseReview.course_id,
                func.avg(CourseReview.rating_overall),
                func.count(CourseReview.id),
            )
            .filter(CourseReview.course_id.in_(course_ids))
            .group_by(CourseReview.course_id)
            .all()
        )
        for course_id, avg_rating, count in review_rows:
            review_map[course_id] = {
                "average_overall": round(avg_rating, 2) if avg_rating is not None else None,
                "review_count": count,
            }

    day_order = {day: index for index, day in enumerate(ALLOWED_DAYS)}

    rows = []
    for assignment, slot_infos in selected:
        course_meta = course_map.get(assignment.course_id, {"id": assignment.course_id})
        room_meta = room_map.get(assignment.room_id) if assignment.room_id else None
        slot_entries = [
            {
                "timeslot_id": slot_id,
                "day": info["day"],
                "day_display": info["day_display"],
                "period": info["period"],
                "start": info["start"],
                "end": info["end"],
                "label": info["label"],
            }
            for slot_id, info in slot_infos
        ]
        slot_entries.sort(key=lambda item: (day_order[item["day"]], item["period"]))

        dept_label = _infer_department_label(course_meta, student)
        year_label = _infer_year_label(course_meta, student)

        rows.append(
            {
                "course": course_meta,
                "room": room_meta,
                "slots": slot_entries,
                "review": review_map.get(assignment.course_id, {"average_overall": None, "review_count": 0}),
                "grouping": {
                    "department": dept_label,
                    "year": year_label,
                },
            }
        )

    rows.sort(
        key=lambda row: (
            day_order[row["slots"][0]["day"]] if row["slots"] else 0,
            row["slots"][0]["period"] if row["slots"] else 0,
        )
    )

    filters_applied: dict[str, Any] = {}
    if preferred_ids:
        filters_applied["preferred_course_ids"] = sorted(preferred_ids)
    if avoid_days:
        filters_applied["avoid_days"] = [day_display(day) for day in sorted(avoid_days, key=lambda d: day_order[d])]
    if avoid_periods:
        filters_applied["avoid_periods"] = sorted(avoid_periods)

    stats.update(
        {
            "selected_courses": len(rows),
            "max_courses": max_courses,
            "rules": {
                "allowed_days": list(ALLOWED_DAYS),
                "min_period": 1,
                "max_period": 9,
                "period_length_minutes": 60,
            },
        }
    )
    if filters_applied:
        stats["applied_filters"] = filters_applied

    breakdown = {
        "by_department": _group_by(rows, key="department"),
        "by_year": _group_by(rows, key="year"),
    }

    return {"timetable": rows, "stats": stats, "breakdown": breakdown}
