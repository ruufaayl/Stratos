"""Algorithm 5 — Zombie / stopped-instance detection.

A "zombie" resource is distinct from an idle one:

  • **Idle** (engine/idle.py):  low but non-zero CPU. Some activity exists.
    Confidence is a continuum; carries real (if low) operational risk.

  • **Zombie** (this module):  CPU is *literally* zero across the full
    telemetry window — the machine is stopped or completely dead, yet the
    account still incurs charges for attached volumes, Elastic IPs, etc.
    Termination risk is near-zero by definition.

Informed by OptScale
    bumiworker/bumiworker/modules/recommendations/
      instances_in_stopped_state_for_a_long_time.py   (Apache-2.0)
      abandoned_instances.py                          (Apache-2.0)

OptScale's pattern: flag instances stopped > N days → sum attached EBS costs.
Our reimplementation:

  1. CPU strictly zero (max across series == 0) → definite zombie.
  2. CPU near-zero (max < NEAR_ZERO_THRESHOLD %) → probable zombie, lower
     confidence.
  3. The dollar figure is the full monthly cost of the resource (EBS continues
     billing even when stopped; the instance itself is not charged, but
     volumes, reserved-capacity waste, Elastic IPs etc. are).

Architecture law: this module only does math. It never calls Claude.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from .catalog import HOURS_PER_MONTH
from .models import Opportunity, ResourceTelemetry

# A strictly-stopped instance has max CPU == 0.0 across the whole window.
STRICT_ZERO_THRESHOLD = 0.0
# "Near-zombie" — CPU so close to zero it can only be a stopped/idle VM.
NEAR_ZERO_CPU_MAX = 0.5        # % — max CPU ever seen in the window
# How many days of data we require before flagging (avoids new-instance FP).
MIN_DAYS_COVERAGE = 7.0
# Samples per day @ 5-minute resolution = 288. Below, we infer from array size.
SAMPLES_PER_DAY = 288


def _infer_days(t: ResourceTelemetry) -> float:
    """Estimate how many days of telemetry the array covers."""
    n = t.cpu.size
    if n == 0:
        return 0.0
    return n / SAMPLES_PER_DAY


def zombie_score(
    t: ResourceTelemetry,
    *,
    min_days: float = MIN_DAYS_COVERAGE,
    near_zero_max: float = NEAR_ZERO_CPU_MAX,
) -> Opportunity | None:
    """Return a zombie opportunity or None.

    Returns None if:
      - Not enough data to be confident (< min_days days of telemetry).
      - Max CPU exceeds near_zero_max (resource is clearly running).

    The confidence level:
      - 1.0  if max CPU == 0.0 (strictly stopped)
      - 0.85 if max CPU > 0 but < near_zero_max (near-zombie / very quiet)
    """
    if t.cpu.size == 0:
        return None

    days = _infer_days(t)
    if days < min_days:
        return None  # Too new to call; wait for more data.

    max_cpu = float(np.max(t.cpu))

    if max_cpu > near_zero_max:
        return None  # Not a zombie.

    # Determine confidence
    if max_cpu <= STRICT_ZERO_THRESHOLD:
        confidence = 1.0
        label = "stopped"
    else:
        confidence = 0.85
        label = "near-stopped"

    monthly_cost = round(t.hourly_cost * HOURS_PER_MONTH, 2)

    return {
        "kind": "zombie",
        "resource_id": t.resource_id,
        "resource_type": t.resource_type,
        # Billing continues for stopped instances (EBS volumes, Elastic IPs).
        # We report the full resource monthly cost as the savings opportunity.
        "monthly_cost": monthly_cost,
        "monthly_savings": round(monthly_cost * confidence, 2),
        "zombie_label": label,        # "stopped" | "near-stopped"
        "max_cpu_pct": round(max_cpu, 3),
        "data_days": round(days, 1),
        "confidence": confidence,
        # Risk is near-zero for a completely stopped machine (no workload to
        # interrupt). We set a tiny non-zero value for near-zombie cases.
        "risk": 0.0 if label == "stopped" else 0.05,
    }


def find_zombies(
    fleet: list[ResourceTelemetry],
    *,
    min_days: float = MIN_DAYS_COVERAGE,
    near_zero_max: float = NEAR_ZERO_CPU_MAX,
) -> list[Opportunity]:
    """Scan a fleet and return zombie opportunities ranked by monthly savings."""
    results: list[Opportunity] = []
    for t in fleet:
        opp = zombie_score(t, min_days=min_days, near_zero_max=near_zero_max)
        if opp is not None:
            results.append(opp)
    results.sort(key=lambda o: o["monthly_savings"], reverse=True)
    return results
