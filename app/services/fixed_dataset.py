from __future__ import annotations

import os
from typing import Any, Dict, List, Set

try:
    import openpyxl  # type: ignore
except ImportError:  # pragma: no cover
    openpyxl = None

DATA_FILE = "20250915_개설강좌조회(학생).xlsx"


def _project_root() -> str:
    cwd = os.getcwd()
    if os.path.isdir(os.path.join(cwd, "data")):
        return cwd
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(here, "../../"))


def _fixed_file_path() -> str:
    return os.path.join(_project_root(), "data", DATA_FILE)


def _read_fixed_rows() -> List[Dict[str, Any]]:
    path = _fixed_file_path()
    if not os.path.exists(path):
        return []
    if openpyxl is None:
        raise RuntimeError("openpyxl is required to access fixed dataset")
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(v or "").strip() for v in rows[0]]
    out: List[Dict[str, Any]] = []
    for r in rows[1:]:
        entry: Dict[str, Any] = {}
        for i, h in enumerate(headers):
            entry[h] = r[i] if i < len(r) else None
        out.append(entry)
    return out


def get_fixed_rows() -> List[Dict[str, Any]]:
    return _read_fixed_rows()


def summarize_fixed_dataset() -> dict[str, Any]:
    rows = _read_fixed_rows()
    if not rows:
        return {"rows": 0, "courses": 0, "departments": [], "file": DATA_FILE}
    codes: Set[str] = set()
    departments: Set[str] = set()
    for row in rows:
        code = str((row.get("과목코드") or row.get("교과목코드") or row.get("강좌번호") or "")).strip()
        if code:
            codes.add(code)
        dept = str((row.get("개설학과") or row.get("학과") or row.get("소속") or "")).strip()
        if dept:
            departments.add(dept)
    return {
        "rows": len(rows),
        "courses": len(codes),
        "departments": sorted(departments),
        "file": DATA_FILE,
    }
