from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass
from typing import Callable, Dict, Optional


@dataclass
class Job:
    id: str
    status: str
    score: Optional[float] = None
    explain: Optional[str] = None


class InMemoryJobQueue:
    def __init__(self) -> None:
        self._jobs: Dict[str, Job] = {}

    def create(self, target: Callable[[str], None]) -> Job:
        job_id = str(uuid.uuid4())
        job = Job(id=job_id, status="queued")
        self._jobs[job_id] = job

        t = threading.Thread(target=target, args=(job_id,), daemon=True)
        t.start()
        return job

    def get(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)

    def update(self, job_id: str, *, status: Optional[str] = None, score: Optional[float] = None, explain: Optional[str] = None) -> None:
        job = self._jobs[job_id]
        if status is not None:
            job.status = status
        if score is not None:
            job.score = score
        if explain is not None:
            job.explain = explain


queue = InMemoryJobQueue()

