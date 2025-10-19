from __future__ import annotations

from typing import List, Optional, Dict, Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import Course, CourseReview, Enrollment, Student
from ..schemas import CourseInsight, CourseRecommendation


def _personalization_boost(student: Student, course: Course, recent_requests: Dict[int, int]) -> float:
    """Simple personalization heuristics:
    - Major match +0.8 (existing)
    - Recent popularity boost from recent_requests (normalized)
    - If student has preferences in profile, consider them (placeholder)
    """
    boost = 0.0
    try:
        if student.major and course.cohort and student.major.lower() in (course.cohort or '').lower():
            boost += 0.8
        # recent_requests is a map course_id->count
        if recent_requests and course.id in recent_requests:
            # normalize by arbitrary scale (recent count / 10)
            boost += min(0.5, recent_requests.get(course.id, 0) / 10.0)
        # profile preferences: example keys: preferred_tags: list[str]
        prefs: Dict[str, Any] = getattr(student, 'profile', {}) or {}
        tags = prefs.get('preferred_tags') if isinstance(prefs, dict) else None
        if tags and isinstance(tags, list) and getattr(course, 'tags', None):
            # small boost for tag overlap
            overlap = len(set(tags).intersection(set(getattr(course, 'tags', []))))
            boost += 0.1 * min(overlap, 3)
    except Exception:
        # never fail personalization
        pass
    return boost


def generate_personalized_recommendations(db: Session, student_id: int, limit: int = 6) -> List[CourseRecommendation]:
    """Enhanced recommendations mixing popularity, ratings and simple personalization.
    This function is intentionally lightweight and uses heuristics rather than heavy ML so it runs without extra deps.
    """
    student = db.get(Student, student_id)
    if student is None:
        raise ValueError("student_not_found")

    courses = db.query(Course).filter(Course.tenant_id == student.tenant_id).all()
    if not courses:
        return []

    # recent requests: placeholder - count enrollments in last N days (simple proxy)
    recent_rows = (
        db.query(Enrollment.course_id, func.count(Enrollment.id).label('cnt'))
        .filter(Enrollment.tenant_id == student.tenant_id)
        .group_by(Enrollment.course_id)
        .all()
    )
    recent_map: Dict[int, int] = {r.course_id: int(r.cnt) for r in recent_rows}

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
        base_score = (avg_rating * 0.6) + ((course.expected_enrollment or 0) * 0.01)
        # personalization
        pboost = _personalization_boost(student, course, recent_map)
        score = base_score + pboost
        reasons: list[str] = []
        if avg_rating:
            reasons.append(f"후기 평점 {avg_rating:.1f}")
        if pboost > 0:
            reasons.append("개인화 추천")
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


def analyze_review_and_update_profile(db: Session, student_id: int, course_id: int, answers: list[int], comment: str | None) -> dict:
    """Simple analysis:
    - Aggregate Likert answers to a preference vector
    - Extract keywords from comment (very naive word-count) and store top keywords in student.profile
    - Return analysis summary used by downstream recommenders
    This is intentionally lightweight; for production you may replace with an NLP model.
    """
    from ..models import Student
    import re

    student = db.get(Student, student_id)
    if student is None:
        raise ValueError("student_not_found")

    # normalize answers (1..5) and compute average
    vec = [int(a) for a in answers[:4]] if answers else []
    avg = sum(vec) / len(vec) if vec else None

    keywords = []
    if comment:
        words = re.findall(r"[가-힣a-zA-Z0-9]{2,}", comment)
        freq: dict[str, int] = {}
        for w in words:
            w2 = w.lower()
            freq[w2] = freq.get(w2, 0) + 1
        sorted_kw = sorted(freq.items(), key=lambda kv: kv[1], reverse=True)
        keywords = [k for k, _ in sorted_kw[:5]]

    # store in student.profile under 'review_signals'
    meta = student.profile or {}
    review_signals = meta.get('review_signals', {})
    review_signals[str(course_id)] = {
        'answers': vec,
        'avg': avg,
        'keywords': keywords,
    }
    meta['review_signals'] = review_signals
    # also add preferred_tags from keywords for personalization
    prefs = meta.get('preferred_tags', [])
    for k in keywords:
        if k not in prefs:
            prefs.append(k)
    meta['preferred_tags'] = prefs
    student.profile = meta
    db.add(student)
    db.commit()
    return {'avg': avg, 'keywords': keywords}



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
