"""Shared data model for the engine.

Every algorithm in the engine consumes a `ResourceTelemetry` and returns a
plain dict. Keeping the inputs uniform across algorithms is what makes the
pipeline composable (idle → rightsize → commitment → ...).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import numpy as np


@dataclass
class ResourceTelemetry:
    """Atomic unit the engine operates on (ENGINE.md §1).

    All array fields are 5-minute datapoints, typically ~4032 over 14 days.
    Use `np.asarray(..., dtype=float)` when loading from JSON/Postgres.
    """

    resource_id: str
    service: str                   # "EC2", "RDS", "S3", ...
    resource_type: str             # "m5.xlarge", "db.r5.large", ...
    region: str
    cpu: np.ndarray                # CPU utilization %, 0..100
    hourly_cost: float             # current on-demand rate ($/hr)

    mem: np.ndarray | None = None
    net_in: np.ndarray | None = None
    net_out: np.ndarray | None = None
    iops: np.ndarray | None = None
    launch_time: datetime | None = None
    tags: dict[str, str] = field(default_factory=dict)


# An opportunity is the engine's atomic output. It is a JSON-serializable dict
# with at minimum: kind, monthly_savings, and a `kind`-specific payload.
Opportunity = dict[str, Any]
