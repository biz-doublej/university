from __future__ import annotations

import random
from collections import defaultdict
from typing import Iterable

from sqlalchemy.orm import Session

from ..models import Course, DepartmentActivation, Enrollment, Student, Tenant
from ..routers import import_dataset as import_router
from .fixed_dataset import get_fixed_rows


def ensure_fixed_dataset(db: Session, tenant: Tenant) -> None:
    rows = get_fixed_rows()
    if not rows:
        return
    normalized = [import_router._dict_to_str_row(row) for row in rows]  # type: ignore[attr-defined]
    import_router._process_rows(db, tenant, normalized)  # type: ignore[attr-defined]
    db.commit()
    _ensure_department_activations(db, tenant, normalized)
    _ensure_sample_students(db, tenant)
    tenant.enrollment_open = True
    db.add(tenant)
    db.commit()


def _extract_department(row: dict[str, str]) -> str:
    for key in ("개설학과", "학과", "department", "소속"):
        value = row.get(key)
        if value:
            value = value.strip()
            if value:
                return value
    return "미분류"


def _ensure_department_activations(db: Session, tenant: Tenant, rows: Iterable[dict[str, str]]) -> None:
    departments = sorted({ _extract_department(row) for row in rows })
    existing = {
        entry.department: entry
        for entry in db.query(DepartmentActivation).filter(DepartmentActivation.tenant_id == tenant.id)
    }
    for dept in departments:
        entry = existing.get(dept)
        if entry:
            entry.active = True
        else:
            db.add(DepartmentActivation(tenant_id=tenant.id, department=dept, active=True))
    db.commit()


def _ensure_sample_students(db: Session, tenant: Tenant) -> None:
    if db.query(Student).filter(Student.tenant_id == tenant.id).count() > 0:
        return
    courses = db.query(Course).filter(Course.tenant_id == tenant.id).all()
    if not courses:
        return
    dept_courses: defaultdict[str, list[Course]] = defaultdict(list)
    for course in courses:
        dept = (course.department or "미분류").strip() or "미분류"
        dept_courses[dept].append(course)

    rng = random.Random(tenant.id or 1)
    student_counter = 1
    for dept, course_list in dept_courses.items():
        if not course_list:
            continue
        target = min(len(course_list), 8)
        for i in range(target):
            email = f"student{tenant.id}_{student_counter}@demo.campus"
            name = f"{dept} 학생 {i + 1:02d}"
            year = rng.choice([1, 2, 3, 4])
            student = Student(
                tenant_id=tenant.id,
                name=name,
                email=email,
                major=dept,
                year=year,
            )
            db.add(student)
            db.flush()
            selections = rng.sample(course_list, min(len(course_list), 3))
            for course in selections:
                enrollment = Enrollment(
                    tenant_id=tenant.id,
                    student_id=student.id,
                    course_id=course.id,
                    status="enrolled",
                    term="2025-1",
                )
                db.add(enrollment)
            student_counter += 1
    db.commit()
