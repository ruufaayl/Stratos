"""Algorithm 5 — Forecast cone (ENGINE.md §6).

Holt-Winters with weekly seasonality; confidence band widens with sqrt(t).
A flat band is a lie. Phase 2.
"""

# def forecast_spend(daily_cost: np.ndarray, horizon: int = 90) -> Opportunity:
#     ...
