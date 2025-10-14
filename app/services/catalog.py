from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Tuple

CATALOG_FILENAME = "한국대학교육협의회_대학별학과정보_20250108.csv"
CATALOG_HEADERS = {
    "school": "학교명",
    "department": "학과명",
    "status": "학과상태명",
    "province": "시도명",
    "city": "시군구명",
}


def _data_path() -> Path:
    data_dir = Path("data")
    path = data_dir / CATALOG_FILENAME
    return path


@lru_cache(maxsize=1)
def load_catalog() -> Dict[str, Dict[str, str]]:
    catalog: Dict[str, Dict[str, str]] = {}
    path = _data_path()
    if not path.exists():
        return catalog

    with path.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            school = (row.get(CATALOG_HEADERS["school"]) or "").strip()
            department = (row.get(CATALOG_HEADERS["department"]) or "").strip()
            status = (row.get(CATALOG_HEADERS["status"]) or "").strip()
            if not school or not department:
                continue
            if department in {"기타(소속학과없음)", ""}:
                continue
            if status == "폐과":
                continue
            school_entry = catalog.setdefault(school, {})
            school_entry[department] = status
    return catalog


def list_universities() -> List[str]:
    data = load_catalog()
    return sorted(data.keys())


def list_departments(university_name: str) -> List[str]:
    data = load_catalog()
    departments = data.get(university_name.strip(), {})
    return sorted(departments.keys())


def validate_pair(university_name: str, department_name: str) -> bool:
    university = university_name.strip()
    department = department_name.strip()
    if not university or not department:
        return False
    departments = load_catalog().get(university)
    if not departments:
        return False
    return department in departments


def catalog_payload() -> List[dict]:
    data = load_catalog()
    payload: List[dict] = []
    for university in sorted(data.keys()):
        payload.append(
            {
                "university": university,
                "departments": sorted(data[university].keys()),
            }
        )
    return payload
