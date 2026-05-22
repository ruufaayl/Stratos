"""Algorithm 3 — Anomaly detection (ENGINE.md §4).

EWMA forecast + EW standard-deviation band. No lookahead leakage. Phase 1.
"""

# def detect_cost_anomalies(daily_cost: np.ndarray, alpha=0.3, k=3.0) -> list[Opportunity]:
#     ...
