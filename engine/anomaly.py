"""Algorithm 3 — Cost-anomaly detection (ENGINE.md §4).

EWMA forecast + EW standard-deviation band. No lookahead leakage — we score
day t using only model state from BEFORE day t, then update.

Provenance: standard EWMA control chart (well-established statistical
technique, not lifted from any specific repo). The "no lookahead" discipline
is the trust feature.
"""

from __future__ import annotations

import numpy as np

from .models import Opportunity

DEFAULT_ALPHA = 0.30        # smoothing factor — higher = react faster
DEFAULT_K = 3.0             # number of sigmas before flagging
DEFAULT_WARMUP_DAYS = 7     # need at least this many days before scoring


def detect_cost_anomalies(
    daily_cost: np.ndarray,
    *,
    alpha: float = DEFAULT_ALPHA,
    k: float = DEFAULT_K,
    warmup_days: int = DEFAULT_WARMUP_DAYS,
) -> list[Opportunity]:
    """Return one opportunity per anomalous day.

    Each opportunity carries the actual spend, the model's expectation, the
    dollar overspend, and the sigma deviation — every number you'd want
    when explaining the alert to a CTO.
    """
    if daily_cost.ndim != 1:
        raise ValueError("daily_cost must be 1-D")
    if daily_cost.size < warmup_days + 1:
        return []

    forecast = float(daily_cost[0])
    ew_var = 0.0
    anomalies: list[Opportunity] = []

    for day in range(1, daily_cost.size):
        actual = float(daily_cost[day])
        resid = actual - forecast
        std = float(np.sqrt(ew_var))

        # Score with PRE-update state. Skip during warmup (model not stable yet).
        if day >= warmup_days and std > 0 and abs(resid) > k * std:
            sigma = resid / std
            anomalies.append({
                "kind": "anomaly",
                "day_index": day,
                "actual": round(actual, 2),
                "expected": round(forecast, 2),
                "overspend": round(resid, 2),
                "sigma": round(sigma, 2),
                # Anomalies are INFORMATIONAL — they describe a past event,
                # not a fixed monthly cashflow you can capture by acting on them.
                # The `overspend` field carries the dollar value for display;
                # `monthly_savings` is zero so anomalies don't inflate the
                # "monthly waste identified" headline.
                "monthly_savings": 0.0,
                "risk": round(min(1.0, k / abs(sigma)), 3) if sigma else 1.0,
            })

        # Update AFTER scoring (no lookahead leakage).
        forecast = alpha * actual + (1 - alpha) * forecast
        ew_var = alpha * resid**2 + (1 - alpha) * ew_var

    return anomalies
