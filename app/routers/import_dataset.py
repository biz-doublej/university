from __future__ import annotations

import csv
import os
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy import select

from ..db import get_db
from ..models import Tenant, Room, Course, Timeslot
from ..services.auth import resolve_tenant_from_headers

router = APIRouter(prefix="/import", tags=["import"])


def _project_root() -> str:
    # Assume uvicorn launched from repo root; otherwise, derive from this file
    cwd = os.getcwd()
    if os.path.isdir(os.path.join(cwd, "data")):
        return cwd
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.abspath(os.path.join(here, "../../"))
    return root


def _find_data_file(preferred: Optional[str] = None) -> Optional[str]:
    root = _project_root()
    data_dir = os.path.join(root, "data")
    if not os.path.isdir(data_dir):
        return None
    if preferred:
        p = preferred if os.path.isabs(preferred) else os.path.join(data_dir, preferred)
        if os.path.exists(p):
            return p
    files = sorted([f for f in os.listdir(data_dir) if f.lower().endswith((".xlsx", ".xls", ".csv"))])
    if not files:
        return None
    return os.path.join(data_dir, files[0])


def _normalize_header(h: str) -> str:
    return (
        h.replace("\n", "").replace("\r", "").replace("\t", "").replace("\"", "").replace("'", "").strip()
    )


def _header_map(headers: List[str]) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    rules: List[tuple[str, str]] = [
        ("순번|no|index", "idx"),
        ("과정|program", "program"),
        ("개설학과|학과|department", "department"),
        ("교과목.*코드|과목코드|code", "course_code"),
        ("교과목명|과목명|name|title", "course_name"),
        ("개설\s*학년|학년|grade", "grade"),
        ("수강\s*분반|분반|section", "section"),
        ("영역구분", "category"),
        ("수강\s*인원|수강인원|등록인원|enrolled", "enrolled"),
        ("제한\s*인원|정원|limit|capacity", "limit"),
        ("개설강좌\s*구분", "course_type"),
        ("주야\s*구분", "daynight"),
        ("개설강좌\s*상태구분|상태", "status"),
        ("강좌\s*대표교수", "lead_prof"),
        ("강좌\s*담당교수|담당교수|교강사|instructor", "instructor"),
        ("수업진행구분", "progress_type"),
        ("수업\s*주수", "weeks"),
        ("교과목\s*학점|학점|credits", "credits"),
        ("강의유형\s*구분", "class_type"),
        ("교과목\s*구분", "subject_type"),
        ("성적부여\s*방법구분", "grading"),
        ("타교강좌\s*구분", "external"),
        ("건물명", "building"),
        ("호실번호", "room_no"),
        ("강의실명|교육공간명", "room_name"),
        ("수업시간표.*요약", "timeslot"),
        ("합반분반구분", "combined_section"),
        ("학습.*실습.*운영계획서.*조회", "plan_url"),
    ]
    for h in headers:
        norm = _normalize_header(h)
        mapped = None
        for rx, key in rules:
            import re

            if re.search(rx, norm, re.IGNORECASE):
                mapped = key
                break
        mapping[h] = mapped or norm
    return mapping


def _read_rows(file_path: str) -> List[Dict[str, str]]:
    if file_path.lower().endswith(".csv"):
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            return [dict(r) for r in reader]
    else:
        try:
            import openpyxl  # type: ignore
        except Exception as e:  # pragma: no cover
            raise RuntimeError("openpyxl is required to read Excel files. pip install openpyxl") from e
        wb = openpyxl.load_workbook(file_path, read_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return []
        headers = [str(v or "").strip() for v in rows[0]]
        out: List[Dict[str, str]] = []
        for r in rows[1:]:
            row: Dict[str, str] = {}
            for i, h in enumerate(headers):
                row[h] = str(r[i] if i < len(r) and r[i] is not None else "")
            out.append(row)
        return out


def _get_or_create_tenant(db, tenant_header: Optional[str]) -> Tenant:
    # Try by ID, then by name, otherwise first enabled
    if tenant_header:
        try:
            tid = int(tenant_header)
            t = db.get(Tenant, tid)
            if t:
                return t
        except Exception:
            pass
        t = db.execute(select(Tenant).where(Tenant.name == tenant_header)).scalars().first()
        if t:
            return t
    return db.execute(select(Tenant).where(Tenant.enabled == True)).scalars().first()  # noqa: E712


@router.post("/dataset")
def import_dataset(
    file: Optional[str] = Query(default=None, description="Specific file name in data/ to import"),
    tenant_key: str | None = Header(default=None, convert_underscores=False, alias="X-Tenant-ID"),
    x_api_key: str | None = Header(default=None, convert_underscores=False, alias="X-API-Key"),
    authorization: str | None = Header(default=None, alias="Authorization"),
    db=Depends(get_db),
):
    path = _find_data_file(file)
    if not path:
        return {"imported": False, "reason": "no data file"}
    tenant = resolve_tenant_from_headers(db, api_key=(x_api_key or authorization or None), tenant_key=tenant_key)
    if tenant is None:
        return {"imported": False, "reason": "no tenant"}

    rows = _read_rows(path)
    if not rows:
        return {"imported": False, "reason": "empty file"}

    map_ = _header_map(list(rows[0].keys()))
    created = {"rooms": 0, "courses": 0, "timeslots": 0}

    # Create timeslots grid if absent (Mon-Fri 09-18 hourly)
    if db.execute(select(Timeslot).where(Timeslot.tenant_id == tenant.id)).first() is None:
        days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
        for d in days:
            for h in range(9, 18):
                start = f"{h:02d}:00"
                end = f"{h+1:02d}:00"
                db.add(Timeslot(tenant_id=tenant.id, day=d, start=start, end=end, granularity=60))
        created["timeslots"] = 9 * 5

    # Index existing
    existing_rooms = {(r.name, r.building): r for r in db.query(Room).filter(Room.tenant_id == tenant.id).all()}
    existing_courses = {c.code: c for c in db.query(Course).filter(Course.tenant_id == tenant.id).all()}

    for r in rows:
        get = lambda k: r.get(next((h for h, m in map_.items() if m == k), ""), "").strip()
        building = get("building")
        room_no = get("room_no")
        room_name = get("room_name") or room_no
        capacity_str = get("limit")
        capacity = int(capacity_str) if capacity_str.isdigit() else 30
        class_type = get("class_type")
        needs_lab_flag = True if ("실습" in class_type) else False

        # Room upsert
        room_key = (room_name, building)
        if room_key not in existing_rooms and room_name:
            room = Room(
                tenant_id=tenant.id,
                name=room_name,
                type="lab" if needs_lab_flag or ("실습" in (room_name or "")) else "classroom",
                capacity=capacity,
                building=building or None,
            )
            db.add(room)
            db.flush()
            existing_rooms[room_key] = room
            created["rooms"] += 1

        # Course upsert
        code = get("course_code") or get("course_name")
        name = get("course_name") or code
        if code and code not in existing_courses:
            hours_pw_str = get("weeks")  # fallback placeholder
            hours_pw = 3
            try:
                hv = int(hours_pw_str)
                if 1 <= hv <= 6:
                    hours_pw = hv
            except Exception:
                pass
            enrolled_str = get("enrolled")
            try:
                expected = int(enrolled_str)
            except Exception:
                expected = 0
            c = Course(
                tenant_id=tenant.id,
                code=code,
                name=name,
                hours_per_week=hours_pw,
                needs_lab=needs_lab_flag,
                expected_enrollment=expected,
            )
            db.add(c)
            db.flush()
            existing_courses[code] = c
            created["courses"] += 1

    db.commit()
    return {"imported": True, "file": os.path.basename(path), "created": created}
