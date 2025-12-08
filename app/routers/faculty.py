from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Course, CourseReview, Enrollment, User
from ..schemas import CourseReviewRequest, FacultyCourseOverview
from ..services.auth import get_user_from_token


router = APIRouter(prefix="/faculty", tags=["faculty"])


def _require_faculty(db: Session, authorization: Optional[str]) -> User:
    user = get_user_from_token(db, authorization)
    if not user:
        raise HTTPException(status_code=403, detail="faculty_required")
    if user.role not in {"Faculty", "Admin"}:
        raise HTTPException(status_code=403, detail="faculty_role_required")
    return user


@router.get("/courses", response_model=List[FacultyCourseOverview])
def course_overview(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> list[FacultyCourseOverview]:
    user = _require_faculty(db, authorization)
    rating_subq = (
        db.query(
            CourseReview.course_id.label("course_id"),
            func.avg(CourseReview.rating_overall).label("avg_rating"),
            func.count(CourseReview.id).label("review_count"),
        )
        .filter(CourseReview.tenant_id == user.tenant_id)
        .group_by(CourseReview.course_id)
        .subquery()
    )
    enrollment_subq = (
        db.query(
            Enrollment.course_id.label("course_id"),
            func.count(Enrollment.id).label("enrollment_count"),
        )
        .filter(Enrollment.tenant_id == user.tenant_id)
        .group_by(Enrollment.course_id)
        .subquery()
    )
    rows = (
        db.query(
            Course,
            rating_subq.c.avg_rating,
            rating_subq.c.review_count,
            enrollment_subq.c.enrollment_count,
        )
        .outerjoin(rating_subq, rating_subq.c.course_id == Course.id)
        .outerjoin(enrollment_subq, enrollment_subq.c.course_id == Course.id)
        .filter(Course.tenant_id == user.tenant_id)
        .order_by(Course.name.asc())
        .all()
    )
    result: list[FacultyCourseOverview] = []
    for course, avg_rating, review_count, enrollment_count in rows:
        result.append(
            FacultyCourseOverview(
                course_id=course.id,
                course_code=course.code,
                course_name=course.name,
                avg_rating=float(avg_rating) if avg_rating is not None else None,
                review_count=int(review_count or 0),
                enrollment_count=int(enrollment_count or 0),
            )
        )
    return result


@router.get("/courses/{course_id}/reviews")
def list_course_reviews(
    course_id: int,
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> list[dict]:
    user = _require_faculty(db, authorization)
    course = db.get(Course, course_id)
    if course is None or course.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="course_not_found")
    reviews = (
        db.query(CourseReview)
        .filter(CourseReview.course_id == course_id)
        .order_by(CourseReview.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "rating_overall": r.rating_overall,
            "rating_difficulty": r.rating_difficulty,
            "rating_instructor": r.rating_instructor,
            "tags": r.tags,
            "comment": r.comment,
            "semester": r.semester,
            "created_at": r.created_at,
        }
        for r in reviews
    ]


@router.post("/courses/{course_id}/reviews/ack", status_code=200)
def acknowledge_review(
    course_id: int,
    payload: CourseReviewRequest,
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = _require_faculty(db, authorization)
    course = db.get(Course, course_id)
    if course is None or course.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="course_not_found")
    # Faculty acknowledgement can store a lightweight log entry using CourseReview with comment only
    review = CourseReview(
        tenant_id=user.tenant_id,
        course_id=course_id,
        student_id=None,
        rating_overall=payload.rating_overall,
        rating_difficulty=payload.rating_difficulty,
        rating_instructor=payload.rating_instructor,
        tags=payload.tags,
        comment=payload.comment,
        semester=payload.semester,
    )
    db.add(review)
    db.commit()
    return {"status": "recorded"}
