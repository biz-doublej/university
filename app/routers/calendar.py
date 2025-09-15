from __future__ import annotations

from fastapi import APIRouter, Query

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.post("/publish")
def publish_calendar(room_id: int = Query(...)):
    # Placeholder: generate a fake sharing URL
    return {"sharing_url": f"https://example.com/calendar/room/{room_id}"}

