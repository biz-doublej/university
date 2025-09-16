from __future__ import annotations

from datetime import time
from fastapi import APIRouter, Depends
from sqlalchemy import select

from ..db import get_db
from ..models import Tenant, Room, Timeslot, Assignment

router = APIRouter(prefix="/dev", tags=["dev"])


@router.post("/seed_minimum")
def seed_minimum(db=Depends(get_db)):
    tenant = db.execute(select(Tenant).where(Tenant.enabled == True)).scalars().first()  # noqa: E712
    if tenant is None:
        return {"created": False, "reason": "no tenant"}

    created = {"rooms": 0, "timeslots": 0}

    if db.execute(select(Room).where(Room.tenant_id == tenant.id)).first() is None:
        db.add_all(
            [
                Room(tenant_id=tenant.id, name="R101", type="classroom", capacity=30, building="A"),
                Room(tenant_id=tenant.id, name="L201", type="lab", capacity=24, building="Lab"),
            ]
        )
        created["rooms"] = 2

    if db.execute(select(Timeslot).where(Timeslot.tenant_id == tenant.id)).first() is None:
        days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
        for d in days:
            for h in range(9, 18):
                start = f"{h:02d}:00"
                end = f"{h+1:02d}:00"
                db.add(Timeslot(tenant_id=tenant.id, day=d, start=start, end=end, granularity=60))
        created["timeslots"] = 9 * 5

    db.commit()
    return {"created": created}


@router.post("/clear_assignments")
def clear_assignments(db=Depends(get_db)):
    tenant = db.execute(select(Tenant).where(Tenant.enabled == True)).scalars().first()  # noqa: E712
    if tenant is None:
        return {"cleared": 0}
    count = db.query(Assignment).filter(Assignment.tenant_id == tenant.id).delete()
    db.commit()
    return {"cleared": count}
