from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class CourseLite:
    id: int
    tenant_id: int
    code: str
    name: str
    hours_per_week: int
    needs_lab: bool
    expected_enrollment: int


@dataclass
class RoomLite:
    id: int
    tenant_id: int
    name: str
    type: str
    capacity: int
    building: Optional[str]


@dataclass
class SlotLite:
    id: int
    tenant_id: int
    day: str
    start: str
    end: str
    granularity: int
    period: int


@dataclass
class AssignmentLite:
    course_id: int
    room_id: int
    slot_ids: list[int]

