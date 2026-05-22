"""Algorithm 2 — Right-sizing (ENGINE.md §3).

p95-of-demand + headroom buffer; find cheapest type keeping p95 below target.
Risk score = how close we'd run to the ceiling post-resize. Phase 1.
"""

# CATALOG = {...}
# def recommend_rightsizing(t, target_util=0.65, headroom=1.0) -> Opportunity | None:
#     ...
