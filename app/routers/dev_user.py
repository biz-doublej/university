from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_db
from ..models import Project, ApiKey, User
from ..services.auth import get_user_from_token, generate_api_key


router = APIRouter(prefix="/dev", tags=["dev"])


def _require_user(db: Session, authorization: str | None) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="missing_token")
    user = get_user_from_token(db, authorization)
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")
    return user


@router.post("/projects")
def create_project(payload: dict, authorization: str | None = Header(default=None, alias="Authorization"), db: Session = Depends(get_db)):
    user = _require_user(db, authorization)
    name = str(payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name_required")
    p = Project(tenant_id=user.tenant_id, name=name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "tenant_id": p.tenant_id, "name": p.name}


@router.get("/projects")
def list_projects(authorization: str | None = Header(default=None, alias="Authorization"), db: Session = Depends(get_db)):
    user = _require_user(db, authorization)
    rows = db.query(Project).filter(Project.tenant_id == user.tenant_id).all()
    return [{"id": r.id, "name": r.name, "tenant_id": r.tenant_id, "active": r.active} for r in rows]


@router.post("/projects/{project_id}/keys")
def issue_key(project_id: int, payload: dict, authorization: str | None = Header(default=None, alias="Authorization"), db: Session = Depends(get_db)):
    user = _require_user(db, authorization)
    p = db.get(Project, project_id)
    if p is None or p.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="project_not_found")
    name = str(payload.get("name") or "default")
    token, row = generate_api_key(db, tenant_id=p.tenant_id, project_id=p.id, name=name)
    return {"api_key": token, "key_prefix": row.key_prefix, "project_id": p.id}


@router.get("/projects/{project_id}/keys")
def list_keys(project_id: int, authorization: str | None = Header(default=None, alias="Authorization"), db: Session = Depends(get_db)):
    user = _require_user(db, authorization)
    p = db.get(Project, project_id)
    if p is None or p.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="project_not_found")
    keys = db.query(ApiKey).filter(ApiKey.project_id == p.id).all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "key_prefix": k.key_prefix,
            "active": k.active,
            "created_at": k.created_at,
            "last_used_at": k.last_used_at,
        }
        for k in keys
    ]

