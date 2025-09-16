from fastapi import APIRouter

from . import import_sections, import_dataset, optimize, timetable, assignments, vacancy, calendar, dev, scheduler_status, admin, auth, dev_user


def get_v1_router() -> APIRouter:
    router = APIRouter(prefix="/v1")
    router.include_router(import_sections.router)
    router.include_router(import_dataset.router)
    router.include_router(optimize.router)
    router.include_router(timetable.router)
    router.include_router(assignments.router)
    router.include_router(vacancy.router)
    router.include_router(calendar.router)
    router.include_router(dev.router)
    router.include_router(scheduler_status.router)
    router.include_router(admin.router)
    router.include_router(auth.router)
    router.include_router(dev_user.router)
    return router
