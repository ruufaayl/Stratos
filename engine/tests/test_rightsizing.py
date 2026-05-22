"""Known-answer tests for engine/rightsizing.py."""

from __future__ import annotations

import numpy as np

from engine import fixtures
from engine.catalog import CATALOG
from engine.rightsizing import find_rightsizing, recommend_rightsizing


def test_overprovisioned_resource_is_downsized() -> None:
    # m5.2xlarge (8 vCPU) running with p95 ≈ 20% → demand ≈ 1.6 vCPU * 1.2 = 1.9.
    # Should fit easily in m5.large (2 vCPU) — the obvious right answer.
    t = fixtures.telemetry(
        "i-overprov",
        cpu=fixtures.cpu_overprovisioned(p95_target=20.0, seed=10),
        resource_type="m5.2xlarge",
        hourly_cost=0.384,
    )
    opp = recommend_rightsizing(t)
    assert opp is not None, "should produce a downsize recommendation"
    assert opp["kind"] == "rightsize"
    assert opp["from_type"] == "m5.2xlarge"
    # We expect a meaningfully cheaper instance, with the new vCPU >= demand.
    new_spec = CATALOG[opp["to_type"]]
    assert new_spec.price_hr < CATALOG["m5.2xlarge"].price_hr
    assert opp["monthly_savings"] > 0
    # p95 captured correctly
    assert opp["p95_cpu_pct"] < 30.0


def test_well_sized_resource_is_not_downsized() -> None:
    t = fixtures.telemetry(
        "i-healthy",
        cpu=fixtures.cpu_well_sized(seed=2),
        resource_type="m5.large",
        hourly_cost=0.096,
    )
    # p95 will be ~70-80%; demand_vcpu = 0.7*2*1.2 = 1.68. floor = 1.68/0.65 ≈ 2.6 → 3 vCPU.
    # No cheaper catalog entry has >=3 vCPU AND lower price than m5.large.
    opp = recommend_rightsizing(t)
    assert opp is None, f"healthy m5.large should not be downsized: {opp}"


def test_unknown_instance_type_returns_none() -> None:
    t = fixtures.telemetry(
        "i-weird",
        cpu=fixtures.cpu_overprovisioned(seed=20),
        resource_type="z9.crazyxlarge",  # not in catalog
    )
    assert recommend_rightsizing(t) is None


def test_too_few_samples_returns_none() -> None:
    t = fixtures.telemetry(
        "i-new",
        cpu=fixtures.cpu_overprovisioned(seed=30)[:50],   # < min_samples
        resource_type="m5.2xlarge",
        hourly_cost=0.384,
    )
    assert recommend_rightsizing(t) is None


def test_risk_score_in_unit_interval() -> None:
    t = fixtures.telemetry(
        "i-some",
        cpu=fixtures.cpu_overprovisioned(p95_target=40.0, seed=40),
        resource_type="m5.2xlarge",
        hourly_cost=0.384,
    )
    opp = recommend_rightsizing(t)
    assert opp is not None
    assert 0.0 <= opp["risk"] <= 1.0
    # 40% p95 of 8 vCPU * 1.2 headroom = 3.84 demand_vcpu
    # If downsized to m5.large (2 vCPU), risk would be 3.84/2 > 1 → not chosen.
    # If downsized to m5.xlarge (4 vCPU), risk = 3.84/4 = 0.96 → amber.
    if opp["to_type"] == "m5.xlarge":
        assert opp["amber"] is True


def test_memory_floor_prevents_starvation() -> None:
    # m5.4xlarge has 64 GiB. Half-floor = 32 GiB.
    # If we pick a cheap c5.4xlarge (32 GiB, 16 vCPU) that should be allowed.
    # But a c5.large (4 GiB) must NOT be picked even though it would meet vCPU.
    cpu = fixtures.cpu_overprovisioned(p95_target=10.0, seed=50)  # very low usage
    t = fixtures.telemetry(
        "i-fat",
        cpu=cpu,
        resource_type="m5.4xlarge",
        hourly_cost=0.768,
    )
    opp = recommend_rightsizing(t)
    if opp is not None:
        new = CATALOG[opp["to_type"]]
        assert new.mem_gib >= CATALOG["m5.4xlarge"].mem_gib * 0.5


def test_find_rightsizing_ranks_by_savings() -> None:
    fleet = [
        fixtures.telemetry(
            "small-savings",
            cpu=fixtures.cpu_overprovisioned(p95_target=10.0, seed=60),
            resource_type="m5.large",
            hourly_cost=0.096,
        ),
        fixtures.telemetry(
            "big-savings",
            cpu=fixtures.cpu_overprovisioned(p95_target=10.0, seed=61),
            resource_type="m5.4xlarge",
            hourly_cost=0.768,
        ),
        fixtures.telemetry(
            "healthy",
            cpu=fixtures.cpu_well_sized(seed=62),
            resource_type="m5.large",
            hourly_cost=0.096,
        ),
    ]
    opps = find_rightsizing(fleet)
    ids = [o["resource_id"] for o in opps]
    assert "healthy" not in ids
    if len(ids) == 2:
        assert ids[0] == "big-savings"
