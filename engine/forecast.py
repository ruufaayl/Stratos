"""Algorithm 5 — Forecast cone (ENGINE.md §6).

Holt-Winters triple exponential smoothing with weekly seasonality, plus a
confidence band that widens with sqrt(t). Flat confidence bands are a lie —
uncertainty compounds over time.

Provenance: Holt-Winters is textbook (statsmodels implementation we use is
BSD). The √t band scaling is standard for random-walk forecast uncertainty.
"""

from __future__ import annotations

import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing

from .models import Opportunity

# 1.28 ≈ z for an 80% two-sided interval. Tightens the cone vs 95%, but
# customers find 80% bands more decision-useful (95% always looks alarmist).
DEFAULT_Z = 1.28
DEFAULT_SEASONAL_PERIODS = 7   # weekly rhythm in daily-cost data


def forecast_spend(
    daily_cost: np.ndarray,
    *,
    horizon: int = 90,
    z: float = DEFAULT_Z,
    seasonal_periods: int = DEFAULT_SEASONAL_PERIODS,
) -> Opportunity:
    """Project daily spend `horizon` days into the future with a √t band.

    Returns a JSON-ready dict with forecast / upper / lower arrays and the
    projected quarter total.
    """
    if daily_cost.ndim != 1:
        raise ValueError("daily_cost must be 1-D")
    if daily_cost.size < seasonal_periods * 2:
        raise ValueError(
            f"need at least {seasonal_periods * 2} observations to fit seasonality"
        )

    model = ExponentialSmoothing(
        daily_cost,
        trend="add",
        seasonal="add",
        seasonal_periods=seasonal_periods,
    ).fit()

    forecast = np.asarray(model.forecast(horizon))
    resid_std = float(np.std(model.resid))

    # √t band — uncertainty grows with horizon.
    band = z * resid_std * np.sqrt(np.arange(1, horizon + 1))
    upper = forecast + band
    lower = np.maximum(0.0, forecast - band)

    return {
        "kind": "forecast",
        "horizon": horizon,
        "z": z,
        "forecast": [round(float(x), 2) for x in forecast],
        "upper": [round(float(x), 2) for x in upper],
        "lower": [round(float(x), 2) for x in lower],
        "projected_quarter_total": round(float(forecast.sum()), 2),
        "uncertainty_at_horizon": round(float(band[-1]), 2),
        # No actionable monthly_savings; this is informational not remediable.
        "monthly_savings": 0.0,
        "risk": 0.0,
    }
