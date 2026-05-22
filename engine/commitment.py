"""Algorithm 4 — Commitment optimization (ENGINE.md §5). THE CROWN JEWEL.

The Newsvendor solution.

You commit to a constant capacity level C at a discounted rate r_c.
Hourly usage U > C overflows at the on-demand rate r_od.

    cost(hour) = C * r_c + max(0, U - C) * r_od

Expected cost minimized when:

    d/dC E[cost] = r_c - r_od * P(U > C) = 0
    P(U > C*)    = r_c / r_od
    F(C*)        = (r_od - r_c) / r_od            ← critical quantile
    C*           = F^-1((r_od - r_c) / r_od)

Plain English: commit to the usage percentile equal to your savings ratio.

Provenance: this is the textbook newsvendor model (Arrow, Harris, Marschak
1951). The application to cloud Savings Plans is well-known in the FinOps
literature. We validate our implementation against OptScale's RI/SP module
in `_harvest/optscale/bumiworker/.../reserved_instances.py`.
"""

from __future__ import annotations

import numpy as np

from .catalog import HOURS_PER_MONTH
from .models import Opportunity


def optimal_commitment(
    hourly_usage: np.ndarray,
    *,
    r_ondemand: float,
    r_committed: float,
    window_hours: int | None = None,
) -> Opportunity:
    """Newsvendor-optimal commitment level for a Savings Plan / RI.

    Args:
        hourly_usage: array of historical hourly usage units (e.g., vCPU-hours).
        r_ondemand:   on-demand rate per unit-hour.
        r_committed:  committed rate per unit-hour (must be < r_ondemand).
        window_hours: monthly normalizer (default = HOURS_PER_MONTH for the
                      ratio between observed window and a calendar month).

    Returns: an Opportunity dict with the exact commit level and the
    guaranteed monthly savings. All numbers are deterministic — given the
    same input, this function returns bit-identical output.
    """
    if hourly_usage.ndim != 1:
        raise ValueError("hourly_usage must be 1-D")
    if hourly_usage.size < 24:
        raise ValueError("need at least 24 hours of usage to fit")
    if not (0 < r_committed < r_ondemand):
        raise ValueError(f"need 0 < r_committed ({r_committed}) < r_ondemand ({r_ondemand})")

    n = hourly_usage.size

    # Critical quantile + optimal commit level (the heart of the algorithm).
    q_star = (r_ondemand - r_committed) / r_ondemand
    c_star = float(np.quantile(hourly_usage, q_star))

    # Cost under each policy, then normalize to a month-equivalent.
    cost_od = float(hourly_usage.sum() * r_ondemand)
    overflow = np.maximum(0.0, hourly_usage - c_star)
    cost_commit = float(n * c_star * r_committed + overflow.sum() * r_ondemand)

    months_in_window = n / HOURS_PER_MONTH
    monthly_factor = 1.0 / months_in_window if months_in_window > 0 else 0.0

    current_monthly = round(cost_od * monthly_factor, 2)
    optimized_monthly = round(cost_commit * monthly_factor, 2)
    monthly_savings = round(current_monthly - optimized_monthly, 2)

    # Coverage = fraction of total usage covered by the commit.
    coverage = float(np.minimum(hourly_usage, c_star).sum() / max(hourly_usage.sum(), 1e-9))

    return {
        "kind": "commitment",
        "commit_level": round(c_star, 4),
        "critical_quantile": round(q_star, 4),
        "current_monthly": current_monthly,
        "optimized_monthly": optimized_monthly,
        "monthly_savings": monthly_savings,
        "savings_pct": round(
            (1 - cost_commit / cost_od) * 100 if cost_od > 0 else 0.0, 2
        ),
        "coverage_pct": round(coverage * 100, 2),
        "samples": n,
        # No "risk" in the rightsizing sense — but if quantile is extreme on
        # very few samples, the recommendation is fragile. Map small-N to risk.
        "risk": round(min(1.0, 30.0 / n) if n < 30 else 0.0, 3),
    }


def expected_cost(C: float, usage: np.ndarray, r_od: float, r_c: float) -> float:
    """Cost under commit level C — used by tests for analytic checks."""
    overflow = np.maximum(0.0, usage - C)
    return float(usage.size * C * r_c + overflow.sum() * r_od)
