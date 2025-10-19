from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

ALLOWED_DAYS: tuple[str, ...] = ("Mon", "Tue", "Wed", "Thu", "Fri")

_DAY_ALIASES: dict[str, str] = {
    "mon": "Mon",
    "monday": "Mon",
    "월": "Mon",
    "mon.": "Mon",
    "1": "Mon",
    "tue": "Tue",
    "tuesday": "Tue",
    "화": "Tue",
    "tue.": "Tue",
    "2": "Tue",
    "wed": "Wed",
    "wednesday": "Wed",
    "수": "Wed",
    "wed.": "Wed",
    "3": "Wed",
    "thu": "Thu",
    "thursday": "Thu",
    "목": "Thu",
    "thu.": "Thu",
    "4": "Thu",
    "fri": "Fri",
    "friday": "Fri",
    "금": "Fri",
    "fri.": "Fri",
    "5": "Fri",
}

_DAY_DISPLAY: dict[str, str] = {
    "Mon": "월요일",
    "Tue": "화요일",
    "Wed": "수요일",
    "Thu": "목요일",
    "Fri": "금요일",
}


def normalize_day(raw: str | None) -> Optional[str]:
    if not raw:
        return None
    key = raw.strip().lower()
    return _DAY_ALIASES.get(key)


def day_display(day: str) -> str:
    return _DAY_DISPLAY.get(day, day)


def compute_period(start: str | None, end: str | None) -> Optional[int]:
    if not start or not end:
        return None
    try:
        start_h, start_m = (int(part) for part in start.split(":"))
        end_h, end_m = (int(part) for part in end.split(":"))
    except (ValueError, AttributeError):
        return None

    if start_m != 0 or end_m != 0:
        return None
    if (end_h * 60 + end_m) - (start_h * 60 + start_m) != 60:
        return None

    # 1st period: 09:00~10:00 -> hour 9 => period 1
    period = start_h - 8
    if 1 <= period <= 9:
        return period
    return None


def period_to_range(period: int) -> tuple[str, str]:
    start_hour = 8 + period
    end_hour = start_hour + 1
    return f"{start_hour:02d}:00", f"{end_hour:02d}:00"


def period_label(period: int) -> str:
    start, end = period_to_range(period)
    return f"{period}교시 ({start}~{end})"


@dataclass(frozen=True)
class SlotWindow:
    day: str
    period: int
    start: str
    end: str

    @property
    def label(self) -> str:
        return f"{day_display(self.day)} {self.period}교시 ({self.start}~{self.end})"


def build_slot_window(day: str, period: int) -> SlotWindow:
    start, end = period_to_range(period)
    return SlotWindow(day=day, period=period, start=start, end=end)


def normalize_slot(day: str | None, start: str | None, end: str | None) -> Optional[SlotWindow]:
    normalized_day = normalize_day(day)
    if normalized_day is None or normalized_day not in ALLOWED_DAYS:
        return None
    period = compute_period(start, end)
    if period is None:
        return None
    def _parse(value: str | None, fallback: str) -> tuple[int, int]:
        if not value:
            hour_str, minute_str = fallback.split(":")
            return int(hour_str), int(minute_str)
        try:
            hour_str, minute_str = value.split(":")
            return int(hour_str), int(minute_str)
        except ValueError:
            hour_f, minute_f = fallback.split(":")
            return int(hour_f), int(minute_f)

    fallback_start, fallback_end = period_to_range(period)
    start_h, start_m = _parse(start, fallback_start)
    end_h, end_m = _parse(end, fallback_end)
    start_time = f"{start_h:02d}:{start_m:02d}"
    end_time = f"{end_h:02d}:{end_m:02d}"
    return SlotWindow(day=normalized_day, period=period, start=start_time, end=end_time)
