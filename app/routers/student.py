from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_db
from ..models import Course, CourseReview, Enrollment, Student, User
from ..schemas import (
    CourseRecommendation,
    CourseReviewRequest,
    EnrollmentItem,
    EnrollmentRequest,
    StudentProfile,
)
from ..services.auth import get_user_from_token
from ..services.recommendation import generate_course_recommendations


router = APIRouter(prefix="/student", tags=["student"])


def _require_student(db: Session, authorization: Optional[str]) -> tuple[User, Student]:
    if not authorization:
        raise HTTPException(status_code=401, detail="missing_token")
    user = get_user_from_token(db, authorization)
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")
    if user.role not in {"Student", "Admin"}:
        raise HTTPException(status_code=403, detail="student_role_required")
    student = db.execute(select(Student).where(Student.user_id == user.id)).scalar_one_or_none()
    if student is None:
        student = Student(
            tenant_id=user.tenant_id,
            user_id=user.id,
            name=user.email.split("@")[0] if user.email else "Student",
            email=user.email,
            major=None,
            year=None,
        )
        db.add(student)
        db.commit()
        db.refresh(student)
    return user, student


@router.get("/profile", response_model=StudentProfile)
def get_profile(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> StudentProfile:
    _, student = _require_student(db, authorization)
    return StudentProfile(
        id=student.id,
        name=student.name,
        major=student.major,
        year=student.year,
        email=student.email,
        metadata=student.metadata,
    )


@router.get("/recommendations", response_model=List[CourseRecommendation])
def get_recommendations(
    limit: int = 6,
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> list[CourseRecommendation]:
    _, student = _require_student(db, authorization)
    return generate_course_recommendations(db, student.id, limit=limit)


@router.get("/enrollments", response_model=List[EnrollmentItem])
def list_enrollments(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> list[EnrollmentItem]:
    _, student = _require_student(db, authorization)
    rows = (
        db.query(Enrollment, Course)
        .join(Course, Enrollment.course_id == Course.id)
        .filter(Enrollment.student_id == student.id)
        .order_by(Enrollment.created_at.desc())
        .all()
    )
    items: list[EnrollmentItem] = []
    for enrollment, course in rows:
        items.append(
            EnrollmentItem(
                id=enrollment.id,
                course_id=enrollment.course_id,
                course_code=course.code if course else None,
                course_name=course.name if course else None,
                status=enrollment.status,
                term=enrollment.term,
                created_at=enrollment.created_at,
            )
        )
    return items


@router.post("/enrollments", response_model=EnrollmentItem)
def upsert_enrollment(
    payload: EnrollmentRequest,
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> EnrollmentItem:
    _, student = _require_student(db, authorization)
    course = db.get(Course, payload.course_id)
    if course is None or course.tenant_id != student.tenant_id:
        raise HTTPException(status_code=404, detail="course_not_found")
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == student.id, Enrollment.course_id == payload.course_id)
        .first()
    )
    status = payload.status or "requested"
    if enrollment is None:
        enrollment = Enrollment(
            tenant_id=student.tenant_id,
            student_id=student.id,
            course_id=payload.course_id,
            status=status,
            term=payload.term,
        )
    else:
        enrollment.status = status
        if payload.term:
            enrollment.term = payload.term
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return EnrollmentItem(
        id=enrollment.id,
        course_id=enrollment.course_id,
        course_code=course.code,
        course_name=course.name,
        status=enrollment.status,
        term=enrollment.term,
        created_at=enrollment.created_at,
    )


@router.post("/reviews", status_code=201)
def submit_review(
    payload: CourseReviewRequest,
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    _, student = _require_student(db, authorization)
    course = db.get(Course, payload.course_id)
    if course is None or course.tenant_id != student.tenant_id:
        raise HTTPException(status_code=404, detail="course_not_found")
    review = CourseReview(
        tenant_id=student.tenant_id,
        course_id=payload.course_id,
        student_id=student.id,
        rating_overall=payload.rating_overall,
        rating_difficulty=payload.rating_difficulty,
        rating_instructor=payload.rating_instructor,
        tags=payload.tags,
        comment=payload.comment,
        semester=payload.semester,
    )
    db.add(review)
    db.commit()
    return {"status": "created"}
