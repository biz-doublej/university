from __future__ import annotations

from typing import List
from fastapi import APIRouter, Query, Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..schemas import TimetableRoomItem
from ..db import get_db
from ..models import Assignment, Course, Timeslot, Room, Tenant
from ..services.auth import resolve_tenant_from_headers

router = APIRouter(prefix="/timetable", tags=["timetable"])


@router.get("/rooms", response_model=List[TimetableRoomItem])
def rooms_timetable(
    week: str = Query(..., description="YYYY-WW"),
    tenant_key: str | None = Header(default=None, convert_underscores=False, alias="X-Tenant-ID"),
    x_api_key: str | None = Header(default=None, convert_underscores=False, alias="X-API-Key"),
    authorization: str | None = Header(default=None, alias="Authorization"),
    db=Depends(get_db),
) -> list[TimetableRoomItem]:
    # Simple projection of current assignments with linked timeslot
    items: list[TimetableRoomItem] = []
    tenant = resolve_tenant_from_headers(db, api_key=(x_api_key or authorization or None), tenant_key=tenant_key)
    q = db.query(Assignment, Course, Timeslot, Room)
    if tenant:
        q = q.filter(Assignment.tenant_id == tenant.id)
    q = q.join(Course, Assignment.course_id == Course.id)
    q = q.join(Timeslot, Assignment.timeslot_id == Timeslot.id)
    q = q.join(Room, Assignment.room_id == Room.id)
    for a, c, t, r in q.all():
        items.append(
            TimetableRoomItem(
                room_id=a.room_id or 0,
                room_name=r.name if r else None,
                day=t.day,
                start=t.start,
                end=t.end,
                course_code=c.code,
            )
        )
    return items
