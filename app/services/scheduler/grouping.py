from __future__ import annotations

from collections import defaultdict
from typing import Dict, List

from .types import SlotLite


def group_slots(slots: list[SlotLite], group_size: int) -> list[list[int]]:
    """
    Group consecutive slots per day into blocks of length `group_size`.
    Returns list of slot-id blocks (each block is list[int]).
    If group_size <= 1, returns [[slot_id] for each slot].
    """
    if group_size <= 1:
        return [[s.id] for s in slots]

    by_day: Dict[str, List[SlotLite]] = defaultdict(list)
    for s in slots:
        by_day[s.day].append(s)
    # Sort by start time lexicographically (works for HH:MM format)
    for day in by_day:
        by_day[day].sort(key=lambda x: x.start)

    blocks: list[list[int]] = []
    for day, day_slots in by_day.items():
        for i in range(0, len(day_slots) - group_size + 1):
            block = day_slots[i : i + group_size]
            blocks.append([s.id for s in block])
    return blocks

