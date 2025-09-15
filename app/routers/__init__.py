from fastapi import APIRouter

from . import import_sections, optimize, timetable, assignments, vacancy, calendar


def get_v1_router() -> APIRouter:
    router = APIRouter(prefix="/v1")
    router.include_router(import_sections.router)
    router.include_router(optimize.router)
    router.include_router(timetable.router)
    router.include_router(assignments.router)
    router.include_router(vacancy.router)
    router.include_router(calendar.router)
    return router

