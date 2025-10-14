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


class CourseInsight(BaseModel):
    summary: str
    sentiment: str
    score: Optional[float] = None
    sample_count: Optional[int] = None
    keywords: list[str] = Field(default_factory=list)


class CourseRecommendation(BaseModel):
    course_id: int
    course_code: Optional[str] = None
    course_name: str
    score: float
    reasons: list[str] = Field(default_factory=list)
    average_rating: Optional[float] = None
    review_summary: CourseInsight


class StudentProfile(BaseModel):
    id: int
    name: str
    major: Optional[str]
    year: Optional[int]
    email: Optional[str]
    metadata: dict[str, Any] = Field(default_factory=dict)


class EnrollmentItem(BaseModel):
    id: int
    course_id: int
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    status: str
    term: Optional[str] = None
    created_at: datetime


class EnrollmentRequest(BaseModel):
    course_id: int
    status: Optional[str] = None
    term: Optional[str] = None


class CourseReviewRequest(BaseModel):
    course_id: int
    rating_overall: Optional[int] = Field(default=None, ge=1, le=5)
    rating_difficulty: Optional[int] = Field(default=None, ge=1, le=5)
    rating_instructor: Optional[int] = Field(default=None, ge=1, le=5)
    tags: list[str] = Field(default_factory=list)
    comment: Optional[str] = None
    semester: Optional[str] = None


class FacultyCourseOverview(BaseModel):
    course_id: int
    course_code: Optional[str] = None
    course_name: str
    avg_rating: Optional[float] = None
    review_count: int = 0
    enrollment_count: int = 0


class AdminDataUpload(BaseModel):
    courses: list[dict[str, Any]] = Field(default_factory=list)
    students: list[dict[str, Any]] = Field(default_factory=list)
    enrollments: list[dict[str, Any]] = Field(default_factory=list)
    reviews: list[dict[str, Any]] = Field(default_factory=list)
