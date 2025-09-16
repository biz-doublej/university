from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class ImportSectionsReport(BaseModel):
    total_rows: int
    valid_rows: int
    errors: list[str] = Field(default_factory=list)


class OptimizeRequest(BaseModel):
    policy_version: int
    week: str  # YYYY-WW
    solver: str | None = Field(default="greedy", description="greedy | pulp | ortools")
    slot_group: int | None = Field(default=1, description="Group N consecutive slots as one block")
    forbid_checks: bool | None = Field(default=True, description="Enable forbidden-set filtering")


class OptimizeStatus(BaseModel):
    job_id: str
    status: str
    score: Optional[float] = None
    explain: Optional[str] = None
    solver: Optional[str] = None


class AssignmentPatch(BaseModel):
    room_id: Optional[int] = None
    timeslot_id: Optional[int] = None
    status: Optional[str] = None  # auto/locked/edited


class TimetableRoomItem(BaseModel):
    room_id: int
    room_name: Optional[str] = None
    day: str
    start: str
    end: str
    course_code: Optional[str] = None


class VacancyHeatmapCell(BaseModel):
    day: str
    time: str
    vacancy_ratio: float
