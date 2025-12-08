from __future__ import annotations

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Query, Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..schemas import VacancyHeatmapCell
from ..db import get_db
from ..models import Tenant, Room, Timeslot, Assignment
from ..services.auth import resolve_tenant_from_headers

router = APIRouter(prefix="/vacancy", tags=["vacancy"])


def _resolve_tenant(db: Session, tenant_key: Optional[str]) -> Optional[Tenant]:
    if tenant_key:
        try:
            tid = int(tenant_key)
            t = db.get(Tenant, tid)
            if t:
                return t
        except Exception:
            pass
        t = db.execute(select(Tenant).where(Tenant.name == tenant_key)).scalars().first()
        if t:
            return t
    return db.execute(select(Tenant).where(Tenant.enabled == True)).scalars().first()  # noqa: E712


@router.get("/heatmap", response_model=List[VacancyHeatmapCell])
def vacancy_heatmap(
    week: str = Query(..., description="YYYY-WW (미사용 placeholder)"),
    building: str | None = Query(default=None),
    tenant_key: str | None = Header(default=None, convert_underscores=False, alias="X-Tenant-ID"),
    x_api_key: str | None = Header(default=None, convert_underscores=False, alias="X-API-Key"),
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> list[VacancyHeatmapCell]:
    tenant = resolve_tenant_from_headers(db, api_key=(x_api_key or authorization or None), tenant_key=tenant_key)
    if tenant is None:
        return []

    # Load all timeslots (tenant-scoped)
    timeslots: list[Timeslot] = db.query(Timeslot).filter(Timeslot.tenant_id == tenant.id).all()
    if not timeslots:
        return []

    # Room scope (optionally by building)
    room_q = db.query(Room).filter(Room.tenant_id == tenant.id)
    if building:
        room_q = room_q.filter(Room.building == building)
    rooms = room_q.all()
    total_rooms = len(rooms)
    if total_rooms == 0:
        return []

    # Pre-index assignments per timeslot
    ts_ids = [t.id for t in timeslots]
    a_rows = (
        db.query(Assignment.room_id, Assignment.timeslot_id)
        .filter(Assignment.tenant_id == tenant.id, Assignment.timeslot_id.in_(ts_ids))
        .all()
    )
    occ_by_ts: dict[int, set[int]] = {}
    for room_id, ts_id in a_rows:
        if room_id is None or ts_id is None:
            continue
        occ_by_ts.setdefault(ts_id, set()).add(room_id)

    # If building filter is present, restrict occupancy sets to that building
    if building:
        allowed_room_ids = {r.id for r in rooms}
        for ts_id in list(occ_by_ts.keys()):
            occ_by_ts[ts_id] = {rid for rid in occ_by_ts[ts_id] if rid in allowed_room_ids}

    # Build heatmap cells by (day, start)
    cells: list[VacancyHeatmapCell] = []
    for t in sorted(timeslots, key=lambda x: (x.day, x.start)):
        occupied = len(occ_by_ts.get(t.id, set()))
        vacant = max(0, total_rooms - occupied)
        ratio = round(vacant / max(1, total_rooms), 4)
        cells.append(VacancyHeatmapCell(day=t.day, time=t.start, vacancy_ratio=ratio))
    return cells


@router.get("/snapshot")
def vacancy_snapshot(
    week: str = Query(..., description="YYYY-WW (미사용 placeholder)"),
    building: str | None = Query(default=None),
    tenant_key: str | None = Header(default=None, convert_underscores=False, alias="X-Tenant-ID"),
    x_api_key: str | None = Header(default=None, convert_underscores=False, alias="X-API-Key"),
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
):
    """실시간 공실 스냅샷 + 히트맵 + 현재 시각 가동률을 함께 제공."""
    tenant = resolve_tenant_from_headers(db, api_key=(x_api_key or authorization or None), tenant_key=tenant_key)
    if tenant is None:
        return {"heatmap": [], "note": "tenant_not_found"}

    timeslots: list[Timeslot] = db.query(Timeslot).filter(Timeslot.tenant_id == tenant.id).all()
    if not timeslots:
        return {"heatmap": [], "note": "no_timeslots"}

    room_q = db.query(Room).filter(Room.tenant_id == tenant.id)
    if building:
        room_q = room_q.filter(Room.building == building)
    rooms = room_q.all()
    total_rooms = len(rooms)
    if total_rooms == 0:
        return {"heatmap": [], "note": "no_rooms"}

    ts_ids = [t.id for t in timeslots]
    a_rows = (
        db.query(Assignment.room_id, Assignment.timeslot_id)
        .filter(Assignment.tenant_id == tenant.id, Assignment.timeslot_id.in_(ts_ids))
        .all()
    )
    occ_by_ts: dict[int, set[int]] = {}
    for room_id, ts_id in a_rows:
        if room_id is None or ts_id is None:
            continue
        occ_by_ts.setdefault(ts_id, set()).add(room_id)

    if building:
        allowed_room_ids = {r.id for r in rooms}
        for ts_id in list(occ_by_ts.keys()):
            occ_by_ts[ts_id] = {rid for rid in occ_by_ts[ts_id] if rid in allowed_room_ids}

    cells: list[VacancyHeatmapCell] = []
    occupied_slots = 0
    for t in sorted(timeslots, key=lambda x: (x.day, x.start)):
        occupied = len(occ_by_ts.get(t.id, set()))
        occupied_slots += occupied
        vacant = max(0, total_rooms - occupied)
        ratio = round(vacant / max(1, total_rooms), 4)
        cells.append(VacancyHeatmapCell(day=t.day, time=t.start, vacancy_ratio=ratio))

    total_slots = len(timeslots) * total_rooms
    utilization_ratio = round(occupied_slots / max(1, total_slots), 4)

    # Live utilization: 현재 요일/시간에 겹치는 슬롯만 계산
    weekday_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    now = datetime.now()
    today_code = weekday_names[now.weekday()]
    now_hm = now.strftime("%H:%M")
    live_slot_ids = [
        t.id
        for t in timeslots
        if t.day == today_code and t.start <= now_hm < t.end
    ]
    live_occupied_ids: set[int] = set()
    for ts_id in live_slot_ids:
        live_occupied_ids |= occ_by_ts.get(ts_id, set())
    live_occupied = len(live_occupied_ids)
    live_util_ratio = round(live_occupied / max(1, total_rooms), 4)

    return {
        "last_refreshed": datetime.utcnow().isoformat() + "Z",
        "building": building,
        "total_rooms": total_rooms,
        "total_timeslots": len(timeslots),
        "occupancy": {
            "occupied_slots": occupied_slots,
            "vacant_slots": max(0, total_slots - occupied_slots),
            "utilization_ratio": utilization_ratio,
        },
        "live": {
            "day": today_code,
            "time": now_hm,
            "occupied_rooms": live_occupied,
            "vacant_rooms": max(0, total_rooms - live_occupied),
            "utilization_ratio": live_util_ratio,
        },
        "heatmap": cells,
    }


@router.get("/available")
def available_rooms(
    day: str = Query(..., description="요일 식별자 (예: Mon)"),
    start: str = Query(..., description="시작 HH:MM"),
    end: str = Query(..., description="종료 HH:MM"),
    building: str | None = Query(default=None),
    tenant_key: str | None = Header(default=None, convert_underscores=False, alias="X-Tenant-ID"),
    x_api_key: str | None = Header(default=None, convert_underscores=False, alias="X-API-Key"),
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
):
    """주어진 구간에 비어있는 강의실 목록을 반환합니다.
    외부 대여 연동(가용 조회)의 기본 API로 사용 가능합니다.
    """
    tenant = resolve_tenant_from_headers(db, api_key=(x_api_key or authorization or None), tenant_key=tenant_key)
    if tenant is None:
        return {"items": []}

    # Candidate rooms
    room_q = db.query(Room).filter(Room.tenant_id == tenant.id)
    if building:
        room_q = room_q.filter(Room.building == building)
    rooms = room_q.all()
    if not rooms:
        return {"items": []}

    # Find overlapping timeslots on that day
    slots = (
        db.query(Timeslot)
        .filter(Timeslot.tenant_id == tenant.id, Timeslot.day == day)
        .all()
    )
    def _overlap(s: Timeslot) -> bool:
        return not (s.end <= start or s.start >= end)  # string compare OK for HH:MM

    slot_ids = [s.id for s in slots if _overlap(s)]
    if not slot_ids:
        # no timeslots overlap → all rooms considered free
        items = [
            {"room_id": r.id, "room_name": r.name, "building": r.building, "capacity": r.capacity}
            for r in rooms
        ]
        return {"items": items}

    # Rooms occupied in any overlapping slot
    occ_rows = (
        db.query(Assignment.room_id)
        .filter(Assignment.tenant_id == tenant.id, Assignment.timeslot_id.in_(slot_ids))
        .all()
    )
    occupied_ids = {rid for (rid,) in occ_rows if rid is not None}

    free = [r for r in rooms if r.id not in occupied_ids]
    items = [
        {"room_id": r.id, "room_name": r.name, "building": r.building, "capacity": r.capacity}
        for r in free
    ]
    # sort by building, then room name
    items.sort(key=lambda x: ((x["building"] or ""), x["room_name"] or ""))
    return {"items": items, "total": len(rooms), "free": len(items)}
