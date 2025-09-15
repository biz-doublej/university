from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .config import get_settings
from .db import init_db, get_db
from .models import Tenant
from .routers import get_v1_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def _startup() -> None:
        init_db()
        # Ensure a default tenant exists for quickstart
        from .db import SessionLocal

        with SessionLocal() as db:
            stmt = select(Tenant).where(Tenant.name == settings.default_tenant_name)
            existing = db.execute(stmt).scalar_one_or_none()
            if existing is None:
                tenant = Tenant(name=settings.default_tenant_name, timezone=settings.timezone, locale="ko")
                db.add(tenant)
                db.commit()

    app.include_router(get_v1_router())

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()

