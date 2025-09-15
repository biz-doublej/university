from __future__ import annotations

from typing import List
from fastapi import APIRouter, Query
from ..schemas import VacancyHeatmapCell

router = APIRouter(prefix="/vacancy", tags=["vacancy"])


@router.get("/heatmap", response_model=List[VacancyHeatmapCell])
def vacancy_heatmap(week: str = Query(...), building: str | None = Query(default=None)):
    # Placeholder: return a minimal heatmap skeleton
    base = [
        VacancyHeatmapCell(day="Mon", time="09:00", vacancy_ratio=0.5),
        VacancyHeatmapCell(day="Mon", time="10:00", vacancy_ratio=0.65),
    ]
    return base

