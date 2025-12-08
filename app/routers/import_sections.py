from __future__ import annotations

import csv
import io
from typing import List

from fastapi import APIRouter, File, UploadFile, Depends, Header
from sqlalchemy import select

from ..db import get_db
from ..models import Course, Tenant
from ..schemas import ImportSectionsReport

router = APIRouter(tags=["import"])


@router.post("/import/sections", response_model=ImportSectionsReport)
def import_sections(
    file: UploadFile = File(...),
    tenant_id: int | None = Header(default=None, convert_underscores=False, alias="X-Tenant-ID"),
    db=Depends(get_db),
):
    """CSV를 운영 DB(.db)에 즉시 반영하여 배정 엔진이 바로 사용하도록 한다."""
    # Resolve tenant: header 우선, 없으면 첫 번째 활성 테넌트
    tenant = db.get(Tenant, tenant_id) if tenant_id is not None else None
    if tenant is None:
        tenant = db.execute(select(Tenant).where(Tenant.enabled == True)).scalars().first()  # noqa: E712
    if tenant is None:
        return ImportSectionsReport(total_rows=0, valid_rows=0, errors=["tenant_not_found"])

    raw = file.file.read()
    buf = io.StringIO(raw.decode("utf-8"))
    reader = csv.DictReader(buf)

    total = 0
    valid = 0
    errors: List[str] = []

    required = {"code", "name", "hours_per_week", "expected_enrollment"}
    for i, row in enumerate(reader, start=2):  # header is line 1
        total += 1
        if not required.issubset(set(k.strip() for k in row.keys())):
            errors.append(f"L{i}: missing required columns")
            continue
        try:
            hours = int(row["hours_per_week"])
            expected = int(row["expected_enrollment"])
        except Exception:
            errors.append(f"L{i}: invalid number in hours/enrollment")
            continue

        code = (row.get("code") or "").strip()
        name = (row.get("name") or "").strip()
        if not code or not name:
            errors.append(f"L{i}: code/name required")
            continue

        cohort = (row.get("cohort") or "").strip() or None
        department = (row.get("department") or "").strip() or None
        needs_lab_raw = (row.get("needs_lab") or "").strip().lower()
        needs_lab = needs_lab_raw in {"1", "true", "yes", "y", "t"}

        course = (
            db.query(Course)
            .filter(Course.tenant_id == tenant.id, Course.code == code)
            .first()
        )
        if course is None:
            course = Course(tenant_id=tenant.id, code=code, name=name)
            db.add(course)
        course.name = name
        course.hours_per_week = hours
        course.expected_enrollment = expected
        course.cohort = cohort
        course.department = department
        course.needs_lab = needs_lab
        valid += 1

    db.commit()
    return ImportSectionsReport(total_rows=total, valid_rows=valid, errors=errors)
