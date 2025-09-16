from __future__ import annotations

from typing import Iterable

from .types import CourseLite, RoomLite


def is_forbidden(course: CourseLite, room: RoomLite) -> bool:
    # Forbidden-set rules
    if course.expected_enrollment > room.capacity:
        return True
    if course.needs_lab and room.type != "lab":
        return True
    return False


def filter_rooms_for_course(course: CourseLite, rooms: Iterable[RoomLite]) -> list[RoomLite]:
    return [r for r in rooms if not is_forbidden(course, r)]

