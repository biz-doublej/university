from __future__ import annotations

from typing import Any, List

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Assignment, Course, Room, Timeslot
from ..schemas import TimetableRoomItem
from ..services.auth import get_user_from_token, resolve_tenant_from_headers
from ..services.timetable import recommend_timetable_for_student

router = APIRouter(prefix="/timetable", tags=["timetable"])


def _require_user(db: Session, authorization: str | None):
    user = get_user_from_token(db, authorization)
    if not user:
        raise HTTPException(status_code=403, detail="user_required")
    return user


@router.post("/recommend")
def recommend_timetable(
    payload: dict[str, Any] | None = None,
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> dict:
    user = _require_user(db, authorization)
    # allow only Student role or Admin
    if user.role not in {"Student", "Admin"}:
        raise HTTPException(status_code=403, detail="student_role_required")
    student_id = payload.get("student_id") if payload else None
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id_required")
    prefs = payload.get("preferences") if payload else {}
    result = recommend_timetable_for_student(db, int(student_id), preferences=prefs)
    return result


@router.get("/rooms", response_model=List[TimetableRoomItem])
def rooms_timetable(
    week: str = Query(..., description="YYYY-WW"),
    tenant_key: str | None = Header(default=None, convert_underscores=False, alias="X-Tenant-ID"),
    x_api_key: str | None = Header(default=None, convert_underscores=False, alias="X-API-Key"),
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> list[TimetableRoomItem]:
    # Simple projection of current assignments with linked timeslot
    items: list[TimetableRoomItem] = []
    tenant = resolve_tenant_from_headers(
        db,
        api_key=(x_api_key or authorization or None),
        tenant_key=tenant_key,
    )
    q = db.query(Assignment, Course, Timeslot, Room)
    if tenant:
        q = q.filter(Assignment.tenant_id == tenant.id)
    q = q.join(Course, Assignment.course_id == Course.id)
    q = q.join(Timeslot, Assignment.timeslot_id == Timeslot.id)
    q = q.join(Room, Assignment.room_id == Room.id)
    for assignment, course, timeslot, room in q.all():
        items.append(
            TimetableRoomItem(
                room_id=assignment.room_id or 0,
                room_name=room.name if room else None,
                day=timeslot.day,
                start=timeslot.start,
                end=timeslot.end,
                course_code=course.code,
            )
        )
    return items
