from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Tenant, Project, ApiKey
from ..services.auth import generate_api_key


router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(token: Optional[str]) -> None:
    admin_token = os.getenv("ADMIN_TOKEN")
    if not admin_token or token != admin_token:
        raise HTTPException(status_code=401, detail="invalid_admin_token")


class CreateTenantReq(BaseModel):
    name: str
    timezone: Optional[str] = None
    locale: Optional[str] = None
    plan: Optional[str] = "Essentials"


@router.post("/tenants")
def create_tenant(req: CreateTenantReq, db: Session = Depends(get_db), x_admin: Optional[str] = Header(default=None, alias="X-Admin-Token")):
    _require_admin(x_admin)
    exists = db.query(Tenant).filter(Tenant.name == req.name).first()
    if exists:
        raise HTTPException(status_code=409, detail="tenant_exists")
    t = Tenant(name=req.name, timezone=req.timezone or "Asia/Seoul", locale=req.locale or "ko", plan=req.plan or "Essentials")
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"id": t.id, "name": t.name}


class CreateProjectReq(BaseModel):
    tenant_id: Optional[int] = None
    tenant_name: Optional[str] = None
    name: str


@router.post("/projects")
def create_project(req: CreateProjectReq, db: Session = Depends(get_db), x_admin: Optional[str] = Header(default=None, alias="X-Admin-Token")):
    _require_admin(x_admin)
    tenant: Optional[Tenant] = None
    if req.tenant_id:
        tenant = db.get(Tenant, req.tenant_id)
    if tenant is None and req.tenant_name:
        tenant = db.query(Tenant).filter(Tenant.name == req.tenant_name).first()
    if tenant is None:
        raise HTTPException(status_code=404, detail="tenant_not_found")
    p = Project(tenant_id=tenant.id, name=req.name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "tenant_id": p.tenant_id, "name": p.name}


class CreateKeyReq(BaseModel):
    name: str = "default"
    key_type: str = Field(default="api", regex="^(api|ai)$")


@router.post("/projects/{project_id}/keys")
def issue_key(project_id: int, req: CreateKeyReq, db: Session = Depends(get_db), x_admin: Optional[str] = Header(default=None, alias="X-Admin-Token")):
    _require_admin(x_admin)
    p = db.get(Project, project_id)
    if p is None:
        raise HTTPException(status_code=404, detail="project_not_found")
    token, row = generate_api_key(db, tenant_id=p.tenant_id, project_id=p.id, name=req.name, key_type=req.key_type)
    return {"api_key": token, "key_prefix": row.key_prefix, "project_id": p.id, "key_type": row.key_type}


@router.get("/projects/{project_id}/keys")
def list_keys(project_id: int, db: Session = Depends(get_db), x_admin: Optional[str] = Header(default=None, alias="X-Admin-Token")):
    _require_admin(x_admin)
    keys = db.query(ApiKey).filter(ApiKey.project_id == project_id).all()
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


class RevokeKeyReq(BaseModel):
    active: bool


@router.patch("/keys/{key_id}")
def revoke_key(key_id: int, req: RevokeKeyReq, db: Session = Depends(get_db), x_admin: Optional[str] = Header(default=None, alias="X-Admin-Token")):
    _require_admin(x_admin)
    k = db.get(ApiKey, key_id)
    if k is None:
        raise HTTPException(status_code=404, detail="key_not_found")
    k.active = bool(req.active)
    db.add(k)
    db.commit()
    return {"id": k.id, "active": k.active}


class TenantAiPortalReq(BaseModel):
    enabled: bool


@router.post("/tenants/{tenant_id}/ai_portal")
def set_ai_portal(tenant_id: int, req: TenantAiPortalReq, db: Session = Depends(get_db), x_admin: Optional[str] = Header(default=None, alias="X-Admin-Token")):
    _require_admin(x_admin)
    tenant = db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="tenant_not_found")
    tenant.ai_portal_enabled = bool(req.enabled)
    db.add(tenant)
    db.commit()
    return {"tenant_id": tenant.id, "ai_portal_enabled": tenant.ai_portal_enabled}
