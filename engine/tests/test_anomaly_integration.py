"""Integration tests: anomaly detection dispatch via /analyze.

Verifies that detect_cost_anomalies() is correctly called from the /analyze
endpoint when daily_cost is provided, and that the output structure matches
the Opportunity contract.
"""

from __future__ import annotations

import numpy as np
from fastapi.testclient import TestClient

from engine.main import app

client = TestClient(app)

# Minimal valid EC2 resource (enough for idle/rightsize pass-through).
_BASE_RESOURCE = {
    "resource_id": "i-anom001",
    "service": "EC2",
    "resource_type": "m5.large",
    "region": "us-east-1",
    "cpu": [80.0] * 48,   # active — will not flag idle/zombie
    "hourly_cost": 0.096,
}


def _daily_cost_with_spike(n: int = 30, spike_day: int = 20, factor: float = 5.0) -> list[float]:
    """Steady daily spend with one obvious spike."""
    rng = np.random.default_rng(42)
    series = (rng.normal(loc=100.0, scale=5.0, size=n)).tolist()
    series[spike_day] = 100.0 * factor
    return series


def test_anomaly_dispatch_returns_anomaly_kind() -> None:
    """When daily_cost contains a planted spike, /analyze returns anomaly opportunities."""
    daily = _daily_cost_with_spike(n=30, spike_day=20)
    r = client.post("/analyze", json={
        "resources": [_BASE_RESOURCE],
        "daily_cost": daily,
    })
    assert r.status_code == 200, r.text
    body = r.json()
    kinds = [o["kind"] for o in body["opportunities"]]
    assert "anomaly" in kinds, f"expected anomaly in kinds, got: {kinds}"


def test_anomaly_opportunity_has_required_fields() -> None:
    """Every anomaly opportunity must carry the CTO-explainable audit fields."""
    daily = _daily_cost_with_spike(n=30, spike_day=20, factor=6.0)
    r = client.post("/analyze", json={
        "resources": [_BASE_RESOURCE],
        "daily_cost": daily,
    })
    assert r.status_code == 200
    anomalies = [o for o in r.json()["opportunities"] if o["kind"] == "anomaly"]
    assert anomalies, "expected at least one anomaly opportunity"
    sample = anomalies[0]
    for field in ("actual", "expected", "overspend", "sigma", "monthly_savings"):
        assert field in sample, f"anomaly opportunity missing field: {field}"
    # Anomalies are informational — they do NOT inflate monthly waste headline.
    assert sample["monthly_savings"] == 0.0


def test_no_anomaly_when_daily_cost_absent() -> None:
    """Omitting daily_cost must produce no anomaly opportunities."""
    r = client.post("/analyze", json={
        "resources": [_BASE_RESOURCE],
    })
    assert r.status_code == 200
    kinds = [o["kind"] for o in r.json()["opportunities"]]
    assert "anomaly" not in kinds


def test_steady_daily_cost_produces_no_spurious_anomalies() -> None:
    """Near-constant daily spend must not fire anomalies (false-positive guard)."""
    steady = [100.0] * 30   # perfectly flat — well within 3-sigma
    r = client.post("/analyze", json={
        "resources": [_BASE_RESOURCE],
        "daily_cost": steady,
    })
    assert r.status_code == 200
    anomalies = [o for o in r.json()["opportunities"] if o["kind"] == "anomaly"]
    assert len(anomalies) == 0, f"unexpected anomalies on flat series: {anomalies}"


def test_short_daily_cost_returns_no_anomaly() -> None:
    """A series shorter than warmup_days must return no anomalies (not an error)."""
    r = client.post("/analyze", json={
        "resources": [_BASE_RESOURCE],
        "daily_cost": [100.0, 200.0, 90.0],   # 3 days < 7-day warmup
    })
    assert r.status_code == 200
    anomalies = [o for o in r.json()["opportunities"] if o["kind"] == "anomaly"]
    assert anomalies == []
