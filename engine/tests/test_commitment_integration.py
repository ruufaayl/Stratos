"""Integration tests: commitment gap dispatch via /analyze.

Verifies that optimal_commitment() is wired into /analyze and that the output
structure matches the Opportunity contract. Commitment opportunities are grouped
by instance type (resource_type) and only fired for catalog-known EC2 instances.
"""

from __future__ import annotations

import numpy as np
from fastapi.testclient import TestClient

from engine.main import app

client = TestClient(app)


def _ec2_resource(
    resource_id: str,
    resource_type: str = "m5.large",
    cpu: list[float] | None = None,
    hourly_cost: float = 0.096,
) -> dict:
    if cpu is None:
        rng = np.random.default_rng(99)
        # 48 samples with realistic variation so newsvendor has something to bite.
        cpu = (rng.uniform(20, 80, size=48)).tolist()
    return {
        "resource_id": resource_id,
        "service": "EC2",
        "resource_type": resource_type,
        "region": "us-east-1",
        "cpu": cpu,
        "hourly_cost": hourly_cost,
    }


def test_commitment_opportunity_returned_for_known_instance_type() -> None:
    """Three m5.large instances with variable CPU should produce a commitment opp."""
    resources = [
        _ec2_resource(f"i-commit{i:03d}", resource_type="m5.large")
        for i in range(3)
    ]
    r = client.post("/analyze", json={"resources": resources})
    assert r.status_code == 200, r.text
    kinds = [o["kind"] for o in r.json()["opportunities"]]
    assert "commitment" in kinds, f"expected commitment kind in {kinds}"


def test_commitment_opportunity_has_required_fields() -> None:
    """Every commitment opportunity must carry the newsvendor audit fields."""
    resources = [
        _ec2_resource(f"i-cmtf{i:03d}", resource_type="m5.xlarge")
        for i in range(2)
    ]
    r = client.post("/analyze", json={"resources": resources})
    assert r.status_code == 200
    commitments = [o for o in r.json()["opportunities"] if o["kind"] == "commitment"]
    assert commitments, "expected at least one commitment opportunity"
    sample = commitments[0]
    for field in (
        "commit_level",
        "critical_quantile",
        "current_monthly",
        "optimized_monthly",
        "monthly_savings",
        "savings_pct",
        "coverage_pct",
        "resource_id",
        "instance_count",
    ):
        assert field in sample, f"commitment opportunity missing field: {field}"


def test_commitment_resource_id_is_instance_type() -> None:
    """resource_id on a commitment opp is the instance type, not an instance ID."""
    resources = [_ec2_resource("i-abc", resource_type="c5.large")]
    r = client.post("/analyze", json={"resources": resources})
    assert r.status_code == 200
    commitments = [o for o in r.json()["opportunities"] if o["kind"] == "commitment"]
    if commitments:   # may be empty if savings ≤ 0 on single flat series
        assert commitments[0]["resource_id"] == "c5.large"


def test_commitment_monthly_savings_nonnegative() -> None:
    """Newsvendor never produces negative savings."""
    resources = [
        _ec2_resource(f"i-ns{i}", resource_type="m5.2xlarge")
        for i in range(4)
    ]
    r = client.post("/analyze", json={"resources": resources})
    assert r.status_code == 200
    for opp in r.json()["opportunities"]:
        if opp["kind"] == "commitment":
            assert opp["monthly_savings"] >= 0.0


def test_commitment_skipped_for_unknown_instance_type() -> None:
    """Instances with an unknown resource_type must not produce commitment opps."""
    resources = [
        {
            "resource_id": "i-unknown",
            "service": "EC2",
            "resource_type": "custom.24xlarge",   # not in catalog
            "region": "us-east-1",
            "cpu": [50.0] * 48,
            "hourly_cost": 5.00,
        }
    ]
    r = client.post("/analyze", json={"resources": resources})
    assert r.status_code == 200
    commitments = [o for o in r.json()["opportunities"] if o["kind"] == "commitment"]
    assert commitments == [], "unknown instance type must not produce commitment opps"


def test_commitment_does_not_block_pipeline_on_empty_fleet() -> None:
    """A fleet of EBS-only resources must not error due to commitment dispatch."""
    r = client.post("/analyze", json={
        "resources": [],
        "ebs_volumes": [
            {
                "volume_id": "vol-abc001",
                "state": "available",
                "size_gb": 100.0,
                "volume_type": "gp2",
                "region": "us-east-1",
            }
        ],
    })
    assert r.status_code == 200
    commitments = [o for o in r.json()["opportunities"] if o["kind"] == "commitment"]
    assert commitments == []
