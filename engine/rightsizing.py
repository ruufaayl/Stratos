"""Algorithm 2 — Right-sizing (ENGINE.md §3).

Size to the 95th percentile of CPU demand plus a headroom buffer, then find
the cheapest catalog entry that still keeps p95 under the target utilization.

p95 (not max) so a single freak spike doesn't force overpaying forever.
Headroom so we never run hot. Risk score = post-resize headroom — if the
resized instance would run at 85% of its ceiling, we flag amber.

Provenance: percentile-headroom approach informed by OptScale's
`rightsizing_instances.py` (Apache-2.0). We reimplemented cleanly in our
types — the catalog selection logic and risk score formulation are ours.
"""

from __future__ import annotations

import numpy as np

from .catalog import CATALOG, HOURS_PER_MONTH, cheaper_alternatives
from .models import Opportunity, ResourceTelemetry

# Tunables. These are conservative defaults — the engine ships safe by default.
DEFAULT_TARGET_UTIL = 0.65          # don't let resized box exceed 65% of its vcpu
DEFAULT_HEADROOM = 1.20             # multiply demand by 1.2x before fitting
DEFAULT_AMBER_RISK = 0.80           # post-resize util above this = warn the human
DEFAULT_MIN_SAMPLES = 100           # need enough signal
DEFAULT_MAX_CPU_VETO = 0.60         # max-CPU above 60% vetoes the downsize
                                    # (protects burst/spiky workloads)


def recommend_rightsizing(
    t: ResourceTelemetry,
    *,
    target_util: float = DEFAULT_TARGET_UTIL,
    headroom: float = DEFAULT_HEADROOM,
    same_family_only: bool = False,
    min_samples: int = DEFAULT_MIN_SAMPLES,
) -> Opportunity | None:
    """Return a downsize recommendation if one exists, else None.

    Memory floor: target type must keep at least half the current memory
    (a hard rule from OptScale's edge cases — surprise-OOMs destroy trust
    faster than over-provisioning costs money).
    """
    if t.resource_type not in CATALOG:
        return None
    if t.cpu.size < min_samples:
        return None

    cur = CATALOG[t.resource_type]

    # Spike veto: if max CPU is high, rare bursts could overwhelm a smaller
    # box (e.g. burst-credit exhaustion on t3 family). OptScale handles this
    # edge case — we encode it directly as a hard veto.
    max_cpu = float(t.cpu.max()) / 100.0
    if max_cpu >= DEFAULT_MAX_CPU_VETO:
        return None

    # Convert "% of current vCPU" → absolute vCPU-equivalent demand
    p95_cpu = float(np.percentile(t.cpu, 95)) / 100.0   # in [0, 1]
    demand_vcpu = p95_cpu * cur.vcpu * headroom         # how many vCPUs we need

    # Memory floor: don't drop below half the current memory.
    mem_floor = cur.mem_gib * 0.5

    # vCPU floor: minimum vCPUs such that demand sits at/below target_util.
    # demand_vcpu / target_util  rounded up to nearest catalog vCPU.
    vcpu_floor_raw = demand_vcpu / max(target_util, 1e-6)
    vcpu_floor = max(1, int(np.ceil(vcpu_floor_raw)))

    candidates = cheaper_alternatives(
        current=t.resource_type,
        min_vcpu=vcpu_floor,
        min_mem_gib=mem_floor,
        same_family_only=same_family_only,
    )
    if not candidates:
        return None

    best = candidates[0]
    # Risk = utilization of the new box at our headroom-adjusted demand.
    # If risk > 1.0 we'd be overcommitted; should be filtered out above, but
    # we clip just to be defensive about float edges.
    risk = float(min(1.0, demand_vcpu / best.vcpu))

    monthly_savings = round((cur.price_hr - best.price_hr) * HOURS_PER_MONTH, 2)

    return {
        "kind": "rightsize",
        "resource_id": t.resource_id,
        "from_type": t.resource_type,
        "to_type": best.name,
        "p95_cpu_pct": round(p95_cpu * 100, 2),
        "demand_vcpu_with_headroom": round(demand_vcpu, 2),
        "from_price_hr": cur.price_hr,
        "to_price_hr": best.price_hr,
        "monthly_savings": monthly_savings,
        "risk": round(risk, 3),
        "amber": risk >= DEFAULT_AMBER_RISK,
    }


def find_rightsizing(
    fleet: list[ResourceTelemetry],
    **kwargs,
) -> list[Opportunity]:
    """Score every resource; return downsize opps ranked by dollar impact."""
    flagged: list[Opportunity] = []
    for t in fleet:
        opp = recommend_rightsizing(t, **kwargs)
        if opp is not None and opp["monthly_savings"] > 0:
            flagged.append(opp)
    flagged.sort(key=lambda o: o["monthly_savings"], reverse=True)
    return flagged
