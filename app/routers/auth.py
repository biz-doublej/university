from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_db
from ..models import User, Tenant
from ..services.auth import hash_password, verify_password, create_session_token, get_user_from_token


router = APIRouter(prefix="/auth", tags=["auth"])


class SignupReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    tenant_name: str = Field(min_length=2)


@router.post("/signup")
def signup(req: SignupReq, db: Session = Depends(get_db)):
    existing = db.execute(select(User).where(User.email == req.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="email_exists")
    tenant = db.execute(select(Tenant).where(Tenant.name == req.tenant_name)).scalar_one_or_none()
    if tenant is None:
        tenant = Tenant(name=req.tenant_name)
        db.add(tenant)
        db.flush()
    user = User(email=req.email, role="Admin", tenant_id=tenant.id, password_hash=hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_session_token(user)
    return {"token": token, "user": {"id": user.id, "email": user.email, "tenant_id": user.tenant_id}}


class LoginReq(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == req.email)).scalar_one_or_none()
    if user is None or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    token = create_session_token(user)
    return {"token": token, "user": {"id": user.id, "email": user.email, "tenant_id": user.tenant_id}}


@router.get("/me")
def me(authorization: str | None = Header(default=None, alias="Authorization"), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="missing_token")
    user = get_user_from_token(db, authorization)
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")
    return {"id": user.id, "email": user.email, "tenant_id": user.tenant_id, "role": user.role}

