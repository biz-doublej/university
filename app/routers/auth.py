from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_db
from ..models import User, Tenant, Student
from ..services.auth import hash_password, verify_password, create_session_token, get_user_from_token
from ..services import catalog


router = APIRouter(prefix="/auth", tags=["auth"])


class SignupReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: Literal["Student", "Faculty", "Admin"]
    university_name: str = Field(min_length=2)
    department_name: Optional[str] = None


@router.post("/signup")
def signup(req: SignupReq, db: Session = Depends(get_db)):
    existing = db.execute(select(User).where(User.email == req.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="email_exists")

    university = (req.university_name or "").strip()
    department = (req.department_name or "").strip()
    if not university:
        raise HTTPException(status_code=400, detail="university_required")

    catalog_data = catalog.load_catalog()
    if catalog_data and university not in catalog_data:
        raise HTTPException(status_code=400, detail="unknown_university")

    if req.role in {"Student", "Faculty"}:
        if not department:
            raise HTTPException(status_code=400, detail="department_required")
        if catalog_data and not catalog.validate_pair(university, department):
            raise HTTPException(status_code=400, detail="unknown_department")
    elif req.role == "Admin" and catalog_data and department and not catalog.validate_pair(university, department):
        raise HTTPException(status_code=400, detail="unknown_department")

    tenant = db.execute(select(Tenant).where(Tenant.name == university)).scalar_one_or_none()
    if tenant is None:
        tenant = Tenant(name=university)
        db.add(tenant)
        db.flush()

    user = User(
        email=req.email,
        role=req.role,
        tenant_id=tenant.id,
        password_hash=hash_password(req.password),
        university_name=university,
        department_name=department or None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if req.role == "Student":
        student = db.execute(select(Student).where(Student.user_id == user.id)).scalar_one_or_none()
        if student is None:
            student = Student(
                tenant_id=tenant.id,
                user_id=user.id,
                name=req.email.split("@")[0],
                email=req.email,
                major=department or None,
                year=None,
            )
            db.add(student)
        else:
            student.email = req.email
            if department:
                student.major = department
        db.commit()

    token = create_session_token(user)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "tenant_id": user.tenant_id,
            "role": user.role,
            "university": user.university_name,
            "department": user.department_name,
        },
    }


class LoginReq(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == req.email)).scalar_one_or_none()
    if user is None or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    token = create_session_token(user)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "tenant_id": user.tenant_id,
            "role": user.role,
            "university": user.university_name,
            "department": user.department_name,
        },
    }


@router.get("/me")
def me(authorization: str | None = Header(default=None, alias="Authorization"), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="missing_token")
    user = get_user_from_token(db, authorization)
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")
    return {
        "id": user.id,
        "email": user.email,
        "tenant_id": user.tenant_id,
        "role": user.role,
        "university": user.university_name,
        "department": user.department_name,
    }


@router.get("/catalog")
def university_catalog():
    payload = catalog.catalog_payload()
    if not payload:
        raise HTTPException(status_code=503, detail="catalog_unavailable")
    return payload
