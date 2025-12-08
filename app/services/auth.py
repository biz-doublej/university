from __future__ import annotations

import base64
import json
import hmac
import os
import secrets
import hashlib
import time
from datetime import datetime
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from ..models import ApiKey, Tenant, Project, User


PEPPER = os.getenv("API_KEY_PEPPER", "")
AUTH_SECRET = os.getenv("AUTH_SECRET", "")


def _sha256_hex(data: str) -> str:
    if PEPPER:
        return hmac.new(PEPPER.encode("utf-8"), data.encode("utf-8"), hashlib.sha256).hexdigest()
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def _gen_prefix(n: int = 10) -> str:
    # urlsafe without confusing chars
    return secrets.token_urlsafe(n)[:n]


def generate_api_key(
    db: Session,
    *,
    tenant_id: int,
    project_id: Optional[int],
    name: str,
    key_type: str = "api",
    scopes: Optional[dict] = None,
) -> tuple[str, ApiKey]:
    """Create an API key and return the plaintext token and the DB row.
    Token format: timora_<prefix>.<secret>
    We store only prefix + hashed(secret).
    """
    prefix = _gen_prefix(10)
    secret = secrets.token_urlsafe(32)
    token = f"timora_{prefix}.{secret}"
    key_hash = _sha256_hex(secret)
    row = ApiKey(
        tenant_id=tenant_id,
        project_id=project_id,
        name=name,
        key_type=key_type,
        key_prefix=prefix,
        key_hash=key_hash,
        scopes=scopes or {},
        active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return token, row


def parse_token(token: str) -> Optional[Tuple[str, str]]:
    try:
        if not token:
            return None
        if token.startswith("Bearer "):
            token = token[len("Bearer "):].strip()
        if not token.startswith("timora_"):
            return None
        body = token[len("timora_"):]
        prefix, secret = body.split(".", 1)
        return prefix, secret
    except Exception:
        return None


def verify_api_key(db: Session, token: str) -> Optional[ApiKey]:
    parsed = parse_token(token)
    if not parsed:
        return None
    prefix, secret = parsed
    row = db.query(ApiKey).filter(ApiKey.key_prefix == prefix, ApiKey.active == True).first()  # noqa: E712
    if not row:
        return None
    if hmac.compare_digest(row.key_hash, _sha256_hex(secret)):
        row.last_used_at = datetime.utcnow()
        db.add(row)
        db.commit()
        return row
    return None


def resolve_tenant_from_headers(db: Session, *, api_key: Optional[str], tenant_key: Optional[str]) -> Optional[Tenant]:
    # 1) API key wins
    if api_key:
        row = verify_api_key(db, api_key)
        if row:
            t = db.get(Tenant, row.tenant_id)
            if t:
                return t
    # 2) Fallback to explicit tenant header
    if tenant_key:
        try:
            tid = int(tenant_key)
            t = db.get(Tenant, tid)
            if t:
                return t
        except Exception:
            pass
        t = db.query(Tenant).filter(Tenant.name == tenant_key).first()
        if t:
            return t
    # 3) Default first enabled
    return db.query(Tenant).filter(Tenant.enabled == True).first()  # noqa: E712


# Password hashing (PBKDF2-HMAC-SHA256)
def hash_password(password: str, *, iterations: int = 120_000) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2${iterations}${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iter_str, salt_b64, hash_b64 = stored.split("$")
        if algo != "pbkdf2":
            return False
        iterations = int(iter_str)
        salt = base64.urlsafe_b64decode(salt_b64.encode())
        expected = base64.urlsafe_b64decode(hash_b64.encode())
        calc = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(expected, calc)
    except Exception:
        return False


# Session token (HMAC-SHA256, not JWT)
def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64u_json(obj: dict) -> str:
    return _b64u(json.dumps(obj, separators=(",", ":")).encode())


def create_session_token(user: User, *, ttl_seconds: int = 7 * 24 * 3600) -> str:
    payload = {"uid": user.id, "tid": user.tenant_id, "exp": int(time.time()) + ttl_seconds}
    p = _b64u_json(payload)
    sig = _b64u(hmac.new(AUTH_SECRET.encode("utf-8"), p.encode(), hashlib.sha256).digest())
    return f"tma.{p}.{sig}"


def verify_session_token(token: str) -> Optional[dict]:
    try:
        if token.startswith("Bearer "):
            token = token[len("Bearer "):].strip()
        if not token.startswith("tma."):
            return None
        _, p, sig = token.split(".", 2)
        expected = _b64u(hmac.new(AUTH_SECRET.encode("utf-8"), p.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(expected, sig):
            return None
        # Pad base64
        pad = "=" * (-len(p) % 4)
        payload = json.loads(base64.urlsafe_b64decode((p + pad).encode()))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def _fallback_user(db: Session) -> Optional[User]:
    user = db.query(User).order_by(User.id.asc()).first()
    if user:
        return user
    tenant = db.query(Tenant).order_by(Tenant.id.asc()).first()
    if tenant is None:
        tenant = Tenant(name="경복대학교 남양주 캠퍼스")
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
    user = User(
        email=f"admin@{tenant.id}.campus",
        role="Admin",
        tenant_id=tenant.id,
        university_name=tenant.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_from_token(db: Session, token: str | None) -> Optional[User]:
    payload = verify_session_token(token or "")
    if payload:
        uid = int(payload.get("uid", 0))
        user = db.get(User, uid)
        if user:
            return user
    return _fallback_user(db)
