"""Known-answer tests for engine/idle.py against synthetic fixtures."""

from __future__ import annotations

import numpy as np

from engine import fixtures
from engine.idle import find_idle, idle_score


def test_idle_resource_is_flagged_with_high_confidence() -> None:
    t = fixtures.telemetry("i-idle", cpu=fixtures.cpu_idle(seed=0))
    opp = idle_score(t)
    assert opp["kind"] == "idle"
    # Default flag threshold is 0.7; a truly dead box should clear it comfortably.
    assert opp["idle_score"] >= 0.85, f"idle CPU should score high, got {opp}"
    assert opp["peak_cpu_pct"] < 5.0


def test_well_sized_resource_is_not_flagged() -> None:
    t = fixtures.telemetry("i-healthy", cpu=fixtures.cpu_well_sized(seed=2))
    opp = idle_score(t)
    assert opp["idle_score"] < 0.1


def test_spiky_resource_is_not_flagged_despite_low_mean() -> None:
    # This is the key trust property: an average-based scorer would kill this.
    cpu = fixtures.cpu_spiky(seed=3)
    # Sanity-check the fixture: real spikes must exist, mean is low.
    assert cpu.max() > 50.0, "test fixture must contain real spikes"
    assert cpu.mean() < 20.0, "test fixture must have low average"
    # During spikes the box serves real traffic — encode that in the net signal.
    net = np.where(cpu > 50, 50_000.0, 100.0)
    t = fixtures.telemetry("i-spiky", cpu=cpu, net_in=net, net_out=net * 0.5)
    opp = idle_score(t)
    # Even with p99 not catching the rare spikes (they're below 1%), the
    # p99 itself sits above the 5% ceiling because background noise is ~5%,
    # so cpu_idle ≈ 0 and the score is correctly suppressed.
    assert opp["idle_score"] < 0.2, f"spiky workload should not be flagged: {opp}"


def test_score_zero_when_network_active_even_if_cpu_idle() -> None:
    # The architectural decision: BOTH must be quiet.
    cpu = fixtures.cpu_idle(seed=0)
    busy_net = np.full_like(cpu, 200_000.0)   # well above 1 KB/s
    t = fixtures.telemetry("i-net-active", cpu=cpu, net_in=busy_net, net_out=busy_net)
    opp = idle_score(t)
    assert opp["idle_score"] == 0.0, "geometric mean must veto when net is active"


def test_savings_scales_with_hourly_cost() -> None:
    t1 = fixtures.telemetry("i-small", cpu=fixtures.cpu_idle(seed=0), hourly_cost=0.10)
    t2 = fixtures.telemetry("i-big",   cpu=fixtures.cpu_idle(seed=0), hourly_cost=1.00)
    s1 = idle_score(t1)["monthly_savings"]
    s2 = idle_score(t2)["monthly_savings"]
    # Allow $0.05 tolerance for the rounding to 2 decimals at each step.
    assert abs(s2 - 10 * s1) < 0.05, (
        f"savings should scale linearly with hourly_cost: {s1} vs {s2}"
    )


def test_find_idle_ranks_by_dollar_impact() -> None:
    fleet = [
        fixtures.telemetry("cheap", cpu=fixtures.cpu_idle(seed=0), hourly_cost=0.05),
        fixtures.telemetry("expensive", cpu=fixtures.cpu_idle(seed=1), hourly_cost=2.00),
        fixtures.telemetry("healthy", cpu=fixtures.cpu_well_sized(seed=2), hourly_cost=10.0),
    ]
    flagged = find_idle(fleet)
    # "healthy" must not appear; "expensive" must rank above "cheap".
    ids = [o["resource_id"] for o in flagged]
    assert "healthy" not in ids
    assert ids == ["expensive", "cheap"]


def test_empty_cpu_raises() -> None:
    import pytest

    t = fixtures.telemetry("empty", cpu=np.array([], dtype=float))
    with pytest.raises(ValueError):
        idle_score(t)
