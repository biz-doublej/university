from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session

from .config import get_settings


class Base(DeclarativeBase):
    pass



def _get_engine():
    return create_engine(get_settings().database_url, echo=False, future=True)


_engine = _get_engine()
SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False, future=True)


def _run_schema_upgrades() -> None:
    with _engine.begin() as conn:
        inspector = inspect(conn)
        # tenants.ai_portal_enabled
        tenant_cols = {col["name"] for col in inspector.get_columns("tenants")}
        if "ai_portal_enabled" not in tenant_cols:
            conn.execute(text("ALTER TABLE tenants ADD COLUMN ai_portal_enabled BOOLEAN DEFAULT 0"))
        # api_keys.key_type
        api_key_cols = {col["name"] for col in inspector.get_columns("api_keys")}
        if "key_type" not in api_key_cols:
            conn.execute(text("ALTER TABLE api_keys ADD COLUMN key_type VARCHAR(16) DEFAULT 'api'"))
            conn.execute(text("UPDATE api_keys SET key_type = 'api' WHERE key_type IS NULL"))
        # students.metadata column rename scenario -> ensure metadata exists
        student_cols = {col["name"] for col in inspector.get_columns("students")}
        if "metadata" not in student_cols:
            conn.execute(text("ALTER TABLE students ADD COLUMN metadata TEXT DEFAULT '{}'"))
        # users.password_hash
        user_cols = {col["name"] for col in inspector.get_columns("users")}
        if "password_hash" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))


def init_db() -> None:
    # Import models to register metadata
    from . import models  # noqa: F401

    _run_schema_upgrades()
    Base.metadata.create_all(bind=_engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a SQLAlchemy Session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
