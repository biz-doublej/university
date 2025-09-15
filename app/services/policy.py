from __future__ import annotations

from typing import Any, Dict
import yaml
from pydantic import BaseModel, Field


class PolicyModel(BaseModel):
    hard: list[dict] = Field(default_factory=list)
    soft: Dict[str, float] = Field(default_factory=dict)
    exceptions: list[dict] = Field(default_factory=list)


def parse_policy_yaml(text: str) -> PolicyModel:
    data = yaml.safe_load(text) or {}
    return PolicyModel(**data)

