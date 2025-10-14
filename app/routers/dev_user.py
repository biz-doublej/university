from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_db
from ..models import Project, ApiKey, User, Tenant
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
    key_type = payload.get("key_type") or "api"
    if key_type not in {"api", "ai"}:
        raise HTTPException(status_code=400, detail="invalid_key_type")
    if key_type == "ai":
        if user.role not in {"Admin"}:
            raise HTTPException(status_code=403, detail="ai_key_requires_admin")
        tenant = db.get(Tenant, user.tenant_id)
        if not tenant or not tenant.ai_portal_enabled:
            raise HTTPException(status_code=403, detail="ai_portal_not_enabled")
    token, row = generate_api_key(db, tenant_id=p.tenant_id, project_id=p.id, name=name, key_type=key_type)
    return {"api_key": token, "key_prefix": row.key_prefix, "project_id": p.id, "key_type": row.key_type}


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
            "key_type": k.key_type,
            "key_prefix": k.key_prefix,
            "active": k.active,
            "created_at": k.created_at,
            "last_used_at": k.last_used_at,
        }
        for k in keys
    ]
