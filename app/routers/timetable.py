from __future__ import annotations

from typing import List
from fastapi import APIRouter, Query
from ..schemas import TimetableRoomItem

router = APIRouter(prefix="/timetable", tags=["timetable"])


@router.get("/rooms", response_model=List[TimetableRoomItem])
def rooms_timetable(week: str = Query(..., description="YYYY-WW")) -> list[TimetableRoomItem]:
    # Placeholder: returns an empty list for base scaffold
    return []

