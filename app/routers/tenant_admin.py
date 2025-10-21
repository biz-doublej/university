from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_db
from ..models import Course, CourseReview, Enrollment, Student, User, Tenant
from ..schemas import AdminDataUpload
from ..services.auth import get_user_from_token, generate_api_key
from pydantic import BaseModel, Field


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
            course = Course(tenant_id=tenant_id, code=code, name=name)
        course.hours_per_week = course_data.get("hours_per_week", course.hours_per_week)
        course.cohort = course_data.get("cohort", course.cohort)
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
    db.add(tenant)
    db.commit()
    return {"enrollment_open": tenant.enrollment_open}
