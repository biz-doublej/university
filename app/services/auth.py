from __future__ import annotations

import hmac
import os
import secrets
import hashlib
from datetime import datetime
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from ..models import ApiKey, Tenant, Project


PEPPER = os.getenv("API_KEY_PEPPER", "")


def _sha256_hex(data: str) -> str:
    if PEPPER:
        return hmac.new(PEPPER.encode("utf-8"), data.encode("utf-8"), hashlib.sha256).hexdigest()
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def _gen_prefix(n: int = 10) -> str:
    # urlsafe without confusing chars
    return secrets.token_urlsafe(n)[:n]


def generate_api_key(db: Session, *, tenant_id: int, project_id: Optional[int], name: str) -> tuple[str, ApiKey]:
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
        key_prefix=prefix,
        key_hash=key_hash,
        scopes={},
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


