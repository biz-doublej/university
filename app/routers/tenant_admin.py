from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (
    Course,
    CourseReview,
    CurriculumActivation,
    DataUpload,
    Enrollment,
    Student,
    Tenant,
    User,
)
from ..schemas import AdminDataUpload
from ..services.auth import get_user_from_token, generate_api_key


router = APIRouter(prefix="/tenant-admin", tags=["tenant-admin"])


def _require_admin_user(db: Session, authorization: Optional[str]) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="missing_token")
    user = get_user_from_token(db, authorization)
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")
    if user.role not in {"Admin", "Manager"}:
        raise HTTPException(status_code=403, detail="admin_role_required")
    return user


@router.get("/summary")
def tenant_summary(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> dict:
    user = _require_admin_user(db, authorization)
    tenant_id = user.tenant_id
    tenant = db.get(Tenant, tenant_id)
    total_courses = db.query(Course).filter(Course.tenant_id == tenant_id).count()
    total_students = db.query(Student).filter(Student.tenant_id == tenant_id).count()
    total_enrollments = db.query(Enrollment).filter(Enrollment.tenant_id == tenant_id).count()
    total_reviews = db.query(CourseReview).filter(CourseReview.tenant_id == tenant_id).count()
    return {
        "courses": total_courses,
        "students": total_students,
        "enrollments": total_enrollments,
        "reviews": total_reviews,
        "ai_portal_enabled": bool(tenant.ai_portal_enabled if tenant else False),
        "enrollment_open": bool(tenant.enrollment_open if tenant else False),
        "enrollment_open_until": tenant.enrollment_open_until.isoformat()
        if tenant and tenant.enrollment_open_until
        else None,
    }


@router.post("/ingest")
def ingest_data(
    payload: AdminDataUpload,
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    user = _require_admin_user(db, authorization)
    tenant_id = user.tenant_id

    counts = {"courses": 0, "students": 0, "enrollments": 0, "reviews": 0}

    for course_data in payload.courses:
        code = course_data.get("code")
        name = course_data.get("name")
        if not code or not name:
            continue
        course = db.execute(
            select(Course).where(Course.tenant_id == tenant_id, Course.code == code)
        ).scalar_one_or_none()
        if course is None:
            course = Course(tenant_id=tenant_id, code=code, name=name, department=course_data.get("department"))
        course.hours_per_week = course_data.get("hours_per_week", course.hours_per_week)
        course.cohort = course_data.get("cohort", course.cohort)
        dept_name = course_data.get("department")
        course.department = dept_name or course.department
        course.needs_lab = course_data.get("needs_lab", course.needs_lab)
        course.expected_enrollment = course_data.get("expected_enrollment", course.expected_enrollment)
        db.add(course)
        counts["courses"] += 1

    for student_data in payload.students:
        email = student_data.get("email")
        name = student_data.get("name") or (email.split("@")[0] if email else None)
        if not name:
            continue
        student = db.execute(
            select(Student).where(Student.tenant_id == tenant_id, Student.email == email)
        ).scalar_one_or_none()
        if student is None:
            student = Student(tenant_id=tenant_id, name=name, email=email)
        student.major = student_data.get("major", student.major)
        student.year = student_data.get("year", student.year)
        meta = student.profile or {}
        meta.update(student_data.get("metadata", {}))
        student.profile = meta
        db.add(student)
        counts["students"] += 1

    for enrollment_data in payload.enrollments:
        student_email = enrollment_data.get("student_email")
        course_code = enrollment_data.get("course_code")
        if not student_email or not course_code:
            continue
        student = db.execute(
            select(Student).where(Student.tenant_id == tenant_id, Student.email == student_email)
        ).scalar_one_or_none()
        course = db.execute(
            select(Course).where(Course.tenant_id == tenant_id, Course.code == course_code)
        ).scalar_one_or_none()
        if not student or not course:
            continue
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == student.id,
            Enrollment.course_id == course.id,
        ).first()
        if enrollment is None:
            enrollment = Enrollment(
                tenant_id=tenant_id,
                student_id=student.id,
                course_id=course.id,
            )
        enrollment.status = enrollment_data.get("status", enrollment.status)
        enrollment.term = enrollment_data.get("term", enrollment.term)
        db.add(enrollment)
        counts["enrollments"] += 1

    for review_data in payload.reviews:
        course_code = review_data.get("course_code")
        if not course_code:
            continue
        course = db.execute(
            select(Course).where(Course.tenant_id == tenant_id, Course.code == course_code)
        ).scalar_one_or_none()
        if not course:
            continue
        student_email = review_data.get("student_email")
        student = None
        if student_email:
            student = db.execute(
                select(Student).where(Student.tenant_id == tenant_id, Student.email == student_email)
            ).scalar_one_or_none()
        review = CourseReview(
            tenant_id=tenant_id,
            course_id=course.id,
            student_id=student.id if student else None,
            rating_overall=review_data.get("rating_overall"),
            rating_difficulty=review_data.get("rating_difficulty"),
            rating_instructor=review_data.get("rating_instructor"),
            tags=review_data.get("tags", []),
            comment=review_data.get("comment"),
            semester=review_data.get("semester"),
        )
        db.add(review)
        counts["reviews"] += 1

    db.commit()
    return counts


def _summarize_curriculum_data(payload: dict[str, Any] | None) -> dict[str, int]:
    summary: dict[str, int] = {}
    if not payload:
        return summary
    for key, value in payload.items():
        if isinstance(value, (list, tuple, set)):
            summary[key] = len(value)
    return summary


class CurriculumActivationReq(BaseModel):
    department: str = Field(min_length=1)
    data: dict[str, Any] = Field(default_factory=dict)
    active_until: Optional[datetime] = None
    activate: bool = Field(default=True)


@router.get("/curriculum")
def list_curriculum(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> List[dict[str, Any]]:
    user = _require_admin_user(db, authorization)
    entries = (
        db.query(CurriculumActivation)
        .filter(CurriculumActivation.tenant_id == user.tenant_id)
        .order_by(CurriculumActivation.created_at.desc())
        .all()
    )
    return [
        {
            "id": entry.id,
            "department": entry.department,
            "active_until": entry.active_until.isoformat() if entry.active_until else None,
            "active": bool(entry.active),
            "created_at": entry.created_at.isoformat(),
            "data_summary": _summarize_curriculum_data(entry.data),
        }
        for entry in entries
    ]


@router.post("/curriculum")
def create_curriculum(
    payload: CurriculumActivationReq,
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    user = _require_admin_user(db, authorization)
    tenant = db.get(Tenant, user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="tenant_not_found")
    entry = CurriculumActivation(
        tenant_id=user.tenant_id,
        department=payload.department.strip() or "전체",
        data=payload.data or {},
        active_until=payload.active_until,
        active=bool(payload.activate),
    )
    db.add(entry)
    tenant.enrollment_open = bool(payload.activate)
    tenant.enrollment_open_until = payload.active_until if payload.activate else None
    db.add(tenant)
    db.commit()
    db.refresh(entry)
    return {
        "id": entry.id,
        "department": entry.department,
        "active_until": entry.active_until.isoformat() if entry.active_until else None,
        "active": entry.active,
        "created_at": entry.created_at.isoformat(),
        "data_summary": _summarize_curriculum_data(entry.data),
    }


class IssueAiKeyReq(BaseModel):
    name: str = Field(default="school-portal", min_length=2)


@router.post("/ai-key")
def issue_ai_key(
    payload: IssueAiKeyReq,
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> dict:
    user = _require_admin_user(db, authorization)
    tenant = db.get(Tenant, user.tenant_id)
    if tenant is None or not tenant.ai_portal_enabled:
        raise HTTPException(status_code=403, detail="ai_portal_not_enabled")

    # AI keys are not tied to developer projects; store without project.
    token, row = generate_api_key(
        db,
        tenant_id=tenant.id,
        project_id=None,
        name=payload.name,
        key_type="ai",
        scopes={"portal": "school"},
    )
    return {"ai_key": token, "key_prefix": row.key_prefix, "key_type": row.key_type}


class EnrollmentToggleReq(BaseModel):
    open: bool = Field(default=False)
    expires_at: Optional[datetime] = None


@router.post("/enrollment-window")
def set_enrollment_window(
    payload: EnrollmentToggleReq,
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> dict:
    user = _require_admin_user(db, authorization)
    tenant = db.get(Tenant, user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="tenant_not_found")
    tenant.enrollment_open = bool(payload.open)
    if payload.open:
        tenant.enrollment_open_until = payload.expires_at
    else:
        tenant.enrollment_open_until = None
    db.add(tenant)
    db.commit()
    return {
        "enrollment_open": tenant.enrollment_open,
        "enrollment_open_until": tenant.enrollment_open_until.isoformat()
        if tenant.enrollment_open_until
        else None,
    }


class ActivateDatasetReq(BaseModel):
    active_until: Optional[datetime] = None


def _serialize_dataset(record: DataUpload) -> dict[str, Any]:
    return {
        "id": record.id,
        "filename": record.filename,
        "file_type": record.file_type,
        "rows": record.rows,
        "summary": record.summary or {},
        "active": bool(record.active),
        "uploaded_at": record.uploaded_at.isoformat(),
        "activated_at": record.activated_at.isoformat() if record.activated_at else None,
    }


@router.get("/datasets")
def list_datasets(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> List[dict[str, Any]]:
    user = _require_admin_user(db, authorization)
    entries = (
        db.query(DataUpload)
        .filter(DataUpload.tenant_id == user.tenant_id)
        .order_by(DataUpload.uploaded_at.desc())
        .all()
    )
    return [_serialize_dataset(entry) for entry in entries]


@router.post("/datasets/{dataset_id}/activate")
def activate_dataset(
    dataset_id: int,
    payload: ActivateDatasetReq,
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    user = _require_admin_user(db, authorization)
    tenant = db.get(Tenant, user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="tenant_not_found")
    dataset = db.get(DataUpload, dataset_id)
    if dataset is None or dataset.tenant_id != tenant.id:
        raise HTTPException(status_code=404, detail="dataset_not_found")
    db.query(DataUpload).filter(DataUpload.tenant_id == tenant.id).update(
        {DataUpload.active: False}, synchronize_session=False
    )
    dataset.active = True
    dataset.activated_at = datetime.utcnow()
    tenant.enrollment_open = True
    tenant.enrollment_open_until = payload.active_until
    db.add(tenant)
    db.add(dataset)
    db.commit()
    return _serialize_dataset(dataset)
