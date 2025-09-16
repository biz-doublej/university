from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session

from .config import get_settings


class Base(DeclarativeBase):
    pass


_engine = create_engine(get_settings().database_url, echo=False, future=True)
SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False, future=True)


def init_db() -> None:
    # Import models to register metadata
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=_engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a SQLAlchemy Session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
