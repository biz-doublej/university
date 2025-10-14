from __future__ import annotations

from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import Course, CourseReview, Enrollment, Student
from ..schemas import CourseInsight, CourseRecommendation


def _summarize_reviews(score: Optional[float], count: int) -> CourseInsight:
    if not score or count == 0:
        return CourseInsight(summary="아직 충분한 후기가 없어요.", sentiment="neutral")
    if score >= 4.5:
        sentiment = "delight"
        summary = "학생들이 매우 만족한 강의예요."
    elif score >= 4.0:
        sentiment = "positive"
        summary = "대체로 긍정적인 후기가 많은 강의입니다."
    elif score >= 3.0:
        sentiment = "mixed"
        summary = "호불호가 갈리는 편이라 후기를 참고하세요."
    else:
        sentiment = "negative"
        summary = "난이도나 만족도가 낮다는 의견이 많아요."
    return CourseInsight(summary=summary, sentiment=sentiment, score=score, sample_count=count)


def generate_course_recommendations(db: Session, student_id: int, limit: int = 6) -> List[CourseRecommendation]:
    student = db.get(Student, student_id)
    if student is None:
        raise ValueError("student_not_found")

    courses = db.query(Course).filter(Course.tenant_id == student.tenant_id).all()
    if not courses:
        return []

    rating_rows = (
        db.query(
            CourseReview.course_id,
            func.avg(CourseReview.rating_overall).label("avg_rating"),
            func.count(CourseReview.id).label("review_count"),
        )
        .filter(CourseReview.tenant_id == student.tenant_id)
        .group_by(CourseReview.course_id)
        .all()
    )
    rating_map: dict[int, tuple[float, int]] = {
        row.course_id: (float(row.avg_rating), int(row.review_count)) for row in rating_rows if row.avg_rating is not None
    }

    enrolled_course_ids = {
        row.course_id for row in db.query(Enrollment.course_id).filter(Enrollment.student_id == student.id).all()
    }

    recommendations: list[CourseRecommendation] = []
    for course in courses:
        if course.id in enrolled_course_ids:
            continue
        avg_rating, review_count = rating_map.get(course.id, (0.0, 0))
        score = avg_rating * 0.6 + (course.expected_enrollment or 0) * 0.01
        reasons: list[str] = []
        if student.major and course.cohort and student.major.lower() in course.cohort.lower():
            score += 0.8
            reasons.append("전공 필수/연계 과목")
        if avg_rating:
            reasons.append(f"후기 평점 {avg_rating:.1f}")
        if not reasons:
            reasons.append("새로 개설된 강의를 경험해보세요")
        insight = _summarize_reviews(avg_rating if avg_rating else None, review_count)
        recommendations.append(
            CourseRecommendation(
                course_id=course.id,
                course_code=course.code,
                course_name=course.name,
                score=round(score, 2),
                reasons=reasons,
                average_rating=avg_rating if avg_rating else None,
                review_summary=insight,
            )
        )

    recommendations.sort(key=lambda r: r.score, reverse=True)
    return recommendations[:limit]
