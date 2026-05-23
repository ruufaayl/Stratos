"""Tests for engine/zombie.py — zombie / stopped-instance detection."""

from __future__ import annotations

import numpy as np
import pytest

from engine import fixtures
from engine.zombie import find_zombies, zombie_score


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _stopped_vm(resource_id: str = "i-stopped", hourly_cost: float = 0.192) -> object:
    """A VM with literally zero CPU — it's stopped."""
    return fixtures.telemetry(
        resource_id,
        cpu=np.zeros(7 * 288, dtype=float),  # 7 days, all zero
        resource_type="m5.xlarge",
        hourly_cost=hourly_cost,
    )


def _near_stopped_vm(resource_id: str = "i-near-stopped", hourly_cost: float = 0.096) -> object:
    """A VM with CPU barely above zero (0.1% max) — near-zombie."""
    rng = np.random.default_rng(99)
    cpu = rng.uniform(0.0, 0.1, size=7 * 288)
    return fixtures.telemetry(
        resource_id,
        cpu=cpu,
        resource_type="m5.large",
        hourly_cost=hourly_cost,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestZombieScore:
    def test_stopped_vm_returns_opportunity(self) -> None:
        opp = zombie_score(_stopped_vm())
        assert opp is not None
        assert opp["kind"] == "zombie"
        assert opp["zombie_label"] == "stopped"
        assert opp["confidence"] == 1.0
        assert opp["max_cpu_pct"] == 0.0
        assert opp["risk"] == 0.0

    def test_stopped_vm_savings_equals_monthly_cost(self) -> None:
        vm = _stopped_vm(hourly_cost=0.192)
        opp = zombie_score(vm)
        assert opp is not None
        # confidence=1.0 so savings == monthly_cost
        assert abs(opp["monthly_savings"] - opp["monthly_cost"]) < 0.01

    def test_near_stopped_vm_returns_lower_confidence(self) -> None:
        opp = zombie_score(_near_stopped_vm())
        assert opp is not None
        assert opp["zombie_label"] == "near-stopped"
        assert opp["confidence"] == 0.85
        assert opp["risk"] == pytest.approx(0.05)

    def test_active_vm_returns_none(self) -> None:
        # Well-used VM (p95 ~65%) should never be flagged
        t = fixtures.telemetry(
            "i-active",
            cpu=fixtures.cpu_well_sized(seed=1),
            resource_type="m5.large",
            hourly_cost=0.096,
        )
        assert zombie_score(t) is None

    def test_idle_but_nonzero_vm_returns_none(self) -> None:
        # idle.py threshold is 5% ceiling; here we use 1% but > 0.5 max → None
        rng = np.random.default_rng(42)
        cpu = rng.uniform(0.6, 1.0, size=7 * 288)  # max ~1% > 0.5 threshold
        t = fixtures.telemetry(
            "i-idle-not-zombie",
            cpu=cpu,
            resource_type="m5.large",
            hourly_cost=0.096,
        )
        assert zombie_score(t) is None

    def test_too_new_returns_none(self) -> None:
        # Only 3 days of data — below MIN_DAYS_COVERAGE=7
        t = fixtures.telemetry(
            "i-new",
            cpu=np.zeros(3 * 288, dtype=float),
            resource_type="m5.large",
            hourly_cost=0.096,
        )
        assert zombie_score(t) is None

    def test_empty_cpu_returns_none(self) -> None:
        t = fixtures.telemetry(
            "i-empty",
            cpu=np.array([], dtype=float),
            resource_type="m5.large",
            hourly_cost=0.096,
        )
        assert zombie_score(t) is None

    def test_data_days_is_reported(self) -> None:
        opp = zombie_score(_stopped_vm())
        assert opp is not None
        # 7 * 288 samples / 288 samples_per_day = 7.0 days
        assert opp["data_days"] == pytest.approx(7.0)


class TestFindZombies:
    def test_ranks_by_savings_descending(self) -> None:
        cheap = _stopped_vm("cheap", hourly_cost=0.050)
        expensive = _stopped_vm("expensive", hourly_cost=0.500)
        alive = fixtures.telemetry(
            "alive",
            cpu=fixtures.cpu_well_sized(seed=10),
            resource_type="m5.large",
            hourly_cost=0.096,
        )
        fleet = [cheap, expensive, alive]
        results = find_zombies(fleet)  # type: ignore[arg-type]
        assert len(results) == 2
        assert results[0]["resource_id"] == "expensive"
        assert results[1]["resource_id"] == "cheap"

    def test_empty_fleet_returns_empty(self) -> None:
        assert find_zombies([]) == []

    def test_fleet_with_no_zombies_returns_empty(self) -> None:
        fleet = [
            fixtures.telemetry(
                f"i-{i}",
                cpu=fixtures.cpu_well_sized(seed=i),
                resource_type="m5.large",
                hourly_cost=0.096,
            )
            for i in range(5)
        ]
        assert find_zombies(fleet) == []
