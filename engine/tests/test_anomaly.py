"""Known-answer tests for engine/anomaly.py."""

from __future__ import annotations

import numpy as np

from engine import fixtures
from engine.anomaly import detect_cost_anomalies


def test_steady_spend_has_few_false_positives() -> None:
    # On 90 days at k=3, expected false-positive count is ~0.3 (P(|Z|>3)*90).
    # EW variance is also slightly underestimated, so we allow up to 2 spurious
    # hits — anything more would point at a genuine algorithm regression.
    series = fixtures.daily_cost_steady(days=90, seed=10)
    anomalies = detect_cost_anomalies(series)
    assert len(anomalies) <= 2, (
        f"steady spend should produce at most 2 false positives, got {anomalies}"
    )


def test_planted_spikes_are_detected() -> None:
    series, planted = fixtures.daily_cost_with_spikes(
        days=90, spike_days=(30, 60), spike_factor=4.0, seed=11
    )
    anomalies = detect_cost_anomalies(series, k=3.0)
    days = {a["day_index"] for a in anomalies}
    # Every planted spike must be caught.
    assert planted.issubset(days), f"missed spike days: {planted - days}"


def test_no_lookahead_leakage() -> None:
    # If we ran the detector with k=infinity it should never fire, regardless of data.
    series, _ = fixtures.daily_cost_with_spikes(spike_factor=10.0)
    assert detect_cost_anomalies(series, k=1e9) == []


def test_warmup_suppresses_early_alerts() -> None:
    # Plant a spike at day 3 — inside the default 7-day warmup. Should NOT fire.
    series = fixtures.daily_cost_steady(days=30, seed=11)
    series[3] += 5000.0   # huge spike
    anomalies = detect_cost_anomalies(series, warmup_days=7)
    assert all(a["day_index"] >= 7 for a in anomalies)


def test_anomaly_payload_includes_audit_fields() -> None:
    series, _ = fixtures.daily_cost_with_spikes(spike_days=(30,), spike_factor=5.0)
    anomalies = detect_cost_anomalies(series)
    assert anomalies, "expected at least one anomaly"
    sample = anomalies[0]
    for required in ("actual", "expected", "overspend", "sigma"):
        assert required in sample, f"missing audit field: {required}"
    assert abs(sample["sigma"]) >= 3.0


def test_short_series_returns_empty() -> None:
    assert detect_cost_anomalies(np.array([1.0, 2.0, 3.0])) == []
