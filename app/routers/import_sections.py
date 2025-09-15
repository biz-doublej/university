from __future__ import annotations

import csv
import io
from typing import List

from fastapi import APIRouter, File, UploadFile, Depends, Header

from ..db import get_db
from ..schemas import ImportSectionsReport

router = APIRouter(tags=["import"])


@router.post("/import/sections", response_model=ImportSectionsReport)
def import_sections(
    file: UploadFile = File(...),
    tenant_id: int | None = Header(default=None, convert_underscores=False, alias="X-Tenant-ID"),
    db=Depends(get_db),
):
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
            int(row["hours_per_week"])  # validate
            int(row["expected_enrollment"])  # validate
            valid += 1
        except Exception:
            errors.append(f"L{i}: invalid number in hours/enrollment")

    return ImportSectionsReport(total_rows=total, valid_rows=valid, errors=errors)

