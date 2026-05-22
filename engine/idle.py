"""Algorithm 1 — Idle detection (ENGINE.md §2).

A resource is idle iff peak utilization is below threshold.
Geometric-mean of CPU and network idleness — refuses to recommend killing
something that still serves traffic. To be implemented in Phase 1.
"""

# def idle_score(t: ResourceTelemetry, idle_ceiling: float = 0.05) -> Opportunity:
#     ...
