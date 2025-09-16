from __future__ import annotations

from typing import List
from fastapi import APIRouter, Query, Depends
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..schemas import TimetableRoomItem
from ..db import get_db
from ..models import Assignment, Course, Timeslot, Room

router = APIRouter(prefix="/timetable", tags=["timetable"])


@router.get("/rooms", response_model=List[TimetableRoomItem])
def rooms_timetable(week: str = Query(..., description="YYYY-WW"), db=Depends(get_db)) -> list[TimetableRoomItem]:
    # Simple projection of current assignments with linked timeslot
    items: list[TimetableRoomItem] = []
    q = (
        db.query(Assignment, Course, Timeslot, Room)
        .join(Course, Assignment.course_id == Course.id)
        .join(Timeslot, Assignment.timeslot_id == Timeslot.id)
        .join(Room, Assignment.room_id == Room.id)
    )
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
