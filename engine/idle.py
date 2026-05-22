"""Algorithm 1 — Idle detection (ENGINE.md §2).

The key math choice: geometric mean of CPU-idleness and network-idleness.
Arithmetic mean would call a spiky-but-quiet CPU "half idle" — dangerous.
Geometric mean is zero unless BOTH signals point at idleness — safe.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from .catalog import HOURS_PER_MONTH
from .models import Opportunity, ResourceTelemetry

# Defaults — tunable per-org later via config.
DEFAULT_IDLE_CEILING = 0.05         # p99 CPU below 5% = candidate
DEFAULT_NET_BYTES_PER_S = 1_000.0   # peak net traffic below 1 KB/s = quiet
DEFAULT_FLAG_THRESHOLD = 0.7        # only flag score >= this


def idle_score(
    t: ResourceTelemetry,
    *,
    idle_ceiling: float = DEFAULT_IDLE_CEILING,
    net_bytes_per_s: float = DEFAULT_NET_BYTES_PER_S,
) -> Opportunity:
    """Score 0..1 — closer to 1 means more confidently idle.

    Returns a JSON-ready opportunity dict. Caller decides whether to flag
    (typical threshold: `idle_score >= 0.7`). The returned dict ALWAYS includes
    the score and dollar context — that's the audit trail for "why this number".
    """
    if t.cpu.size == 0:
        raise ValueError("idle_score requires at least one CPU sample")

    p99 = float(np.percentile(t.cpu, 99)) / 100.0   # peak demand
    cpu_idle = max(0.0, 1.0 - p99 / idle_ceiling)   # 1 = totally idle

    # Net signal: if any net data exists, use it. Otherwise default cpu-only confidence.
    if t.net_in is not None and t.net_out is not None and t.net_in.size and t.net_out.size:
        net_peak = float(np.percentile(t.net_in + t.net_out, 99))
        net_idle = 1.0 if net_peak < net_bytes_per_s else 0.0
    else:
        # No network telemetry — be conservative: use 0.5 so we never get a
        # score of 1.0 from CPU alone (avoids overconfident kill recommendations).
        net_peak = float("nan")
        net_idle = 0.5

    # Geometric mean: zero if either signal disagrees.
    score = float((cpu_idle * net_idle) ** 0.5)
    monthly_cost = round(t.hourly_cost * HOURS_PER_MONTH, 2)

    return {
        "kind": "idle",
        "resource_id": t.resource_id,
        "resource_type": t.resource_type,
        "idle_score": round(score, 3),
        "peak_cpu_pct": round(p99 * 100, 2),
        "peak_net_bps": None if np.isnan(net_peak) else round(net_peak, 2),
        "monthly_cost": monthly_cost,
        "monthly_savings": round(monthly_cost * score, 2),
        # risk inverts the score — UI dots use this directly.
        "risk": round(1.0 - score, 3),
    }


def find_idle(
    fleet: list[ResourceTelemetry],
    *,
    threshold: float = DEFAULT_FLAG_THRESHOLD,
    **kwargs: Any,
) -> list[Opportunity]:
    """Score every resource and return those above `threshold`, ranked by $."""
    flagged: list[Opportunity] = []
    for t in fleet:
        opp = idle_score(t, **kwargs)
        if opp["idle_score"] >= threshold:
            flagged.append(opp)
    flagged.sort(key=lambda o: o["monthly_savings"], reverse=True)
    return flagged
