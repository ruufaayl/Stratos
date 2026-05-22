"""Tests for engine/commitment.py — the newsvendor.

These tests are mostly mathematical: we have an analytic optimum we can verify
the implementation against. Tests are deterministic via fixed seeds.
"""

from __future__ import annotations

import numpy as np
import pytest

from engine.commitment import expected_cost, optimal_commitment


def test_commit_matches_critical_quantile() -> None:
    rng = np.random.default_rng(0)
    usage = rng.uniform(0, 100, size=10_000)
    r_od, r_c = 1.0, 0.6
    opp = optimal_commitment(usage, r_ondemand=r_od, r_committed=r_c)
    expected_q = (r_od - r_c) / r_od     # 0.4
    assert abs(opp["critical_quantile"] - expected_q) < 1e-9
    expected_c = float(np.quantile(usage, expected_q))
    assert abs(opp["commit_level"] - expected_c) < 1e-3


def test_optimal_beats_any_nearby_commit() -> None:
    """The cost function should be minimized AT c_star. Validate by sweeping ±10%."""
    rng = np.random.default_rng(1)
    usage = rng.gamma(shape=2.0, scale=5.0, size=2000)
    r_od, r_c = 1.0, 0.55
    opp = optimal_commitment(usage, r_ondemand=r_od, r_committed=r_c)
    c_star = opp["commit_level"]
    base = expected_cost(c_star, usage, r_od, r_c)
    for delta in (-0.20, -0.10, -0.05, 0.05, 0.10, 0.20):
        alt = expected_cost(c_star * (1 + delta), usage, r_od, r_c)
        # base must be <= alt up to small numerical jitter.
        assert base <= alt + 1e-6, f"optimum failed at delta={delta}: {base} > {alt}"


def test_bigger_discount_commits_more() -> None:
    """Critical quantile = (r_od - r_c) / r_od.
    Bigger discount = smaller r_c/r_od = larger critical quantile = higher commit.
    """
    rng = np.random.default_rng(2)
    usage = rng.uniform(0, 100, size=5000)
    cheap = optimal_commitment(usage, r_ondemand=1.0, r_committed=0.30)
    pricy = optimal_commitment(usage, r_ondemand=1.0, r_committed=0.80)
    assert cheap["commit_level"] > pricy["commit_level"]
    assert cheap["savings_pct"] > pricy["savings_pct"]


def test_savings_always_nonnegative() -> None:
    rng = np.random.default_rng(3)
    for seed in range(5):
        usage = rng.gamma(shape=3.0, scale=10.0, size=720)
        opp = optimal_commitment(usage, r_ondemand=1.0, r_committed=0.7)
        assert opp["monthly_savings"] >= 0.0


def test_validates_inputs() -> None:
    usage = np.linspace(0, 100, 100)
    with pytest.raises(ValueError):
        optimal_commitment(usage, r_ondemand=0.5, r_committed=0.6)  # discount inverted
    with pytest.raises(ValueError):
        optimal_commitment(np.array([1.0]), r_ondemand=1.0, r_committed=0.5)  # too few
    with pytest.raises(ValueError):
        optimal_commitment(np.zeros((2, 3)), r_ondemand=1.0, r_committed=0.5)  # 2-D


def test_coverage_makes_sense() -> None:
    """If r_c approaches r_od, critical quantile approaches 0 — we cover almost nothing."""
    rng = np.random.default_rng(4)
    usage = rng.uniform(0, 100, size=2000)
    opp = optimal_commitment(usage, r_ondemand=1.0, r_committed=0.99)
    # tiny discount → tiny commit → near-zero coverage
    assert opp["coverage_pct"] < 5.0
