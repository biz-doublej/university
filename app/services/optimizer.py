from __future__ import annotations

import random
import time

from .jobs import queue


def submit_optimize_job(policy_version: int, week: str) -> str:
    def _worker(job_id: str) -> None:
        queue.update(job_id, status="running")
        # Simulate compute
        time.sleep(1.0)
        score = round(random.uniform(0.7, 0.95), 4)
        explain = f"Optimization complete for {week} with policy v{policy_version}."
        queue.update(job_id, status="completed", score=score, explain=explain)

    job = queue.create(_worker)
    return job.id

