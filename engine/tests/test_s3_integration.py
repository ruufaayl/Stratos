"""Integration tests: S3 zombie bucket detection via /analyze (D12-A).

Verifies that S3BucketIn → _s3_zombie_opportunities() dispatch is wired
correctly into the /analyze endpoint and that the heuristic (size > 0,
age >= 90 days, monthly_cost >= $0.01) gates output as designed.
"""

from __future__ import annotations

import datetime

from fastapi.testclient import TestClient

from engine.main import S3_STANDARD_GB_MONTH_USD, app

client = TestClient(app)


def _iso_days_ago(days: int) -> str:
    """ISO-8601 timestamp `days` days before now, UTC."""
    dt = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
    return dt.isoformat().replace("+00:00", "Z")


# A reasonably large bucket (50 GB) — well above the $0.01/mo threshold.
_FIFTY_GB_BYTES = 50 * (1024 ** 3)
# A tiny bucket (100 KB) — well below the $0.01/mo threshold.
_TINY_BYTES = 100 * 1024


def test_s3_empty_bucket_not_flagged() -> None:
    """A bucket with size_bytes == 0 produces no zombie opportunity."""
    r = client.post("/analyze", json={
        "resources": [],
        "s3_buckets": [
            {
                "bucket_name": "empty-bucket",
                "region": "us-east-1",
                "creation_date": _iso_days_ago(365),
                "size_bytes": 0,
            }
        ],
    })
    assert r.status_code == 200, r.text
    body = r.json()
    s3_opps = [o for o in body["opportunities"] if o.get("resource_id") == "empty-bucket"]
    assert s3_opps == [], f"empty bucket should not flag: {s3_opps}"


def test_s3_small_bucket_not_flagged() -> None:
    """A bucket whose monthly cost rounds below $0.01 is skipped."""
    r = client.post("/analyze", json={
        "resources": [],
        "s3_buckets": [
            {
                "bucket_name": "tiny-bucket",
                "region": "us-east-1",
                "creation_date": _iso_days_ago(365),
                "size_bytes": _TINY_BYTES,
            }
        ],
    })
    assert r.status_code == 200, r.text
    body = r.json()
    s3_opps = [o for o in body["opportunities"] if o.get("resource_id") == "tiny-bucket"]
    assert s3_opps == [], f"tiny bucket should not flag: {s3_opps}"


def test_s3_new_bucket_not_flagged() -> None:
    """A large but new (< 90 days) bucket is not yet a zombie candidate."""
    r = client.post("/analyze", json={
        "resources": [],
        "s3_buckets": [
            {
                "bucket_name": "new-bucket",
                "region": "us-east-1",
                "creation_date": _iso_days_ago(10),
                "size_bytes": _FIFTY_GB_BYTES,
            }
        ],
    })
    assert r.status_code == 200, r.text
    body = r.json()
    s3_opps = [o for o in body["opportunities"] if o.get("resource_id") == "new-bucket"]
    assert s3_opps == [], f"new bucket should not flag: {s3_opps}"


def test_s3_stale_bucket_flagged() -> None:
    """A large old bucket → zombie opportunity with the expected monthly_savings."""
    r = client.post("/analyze", json={
        "resources": [],
        "s3_buckets": [
            {
                "bucket_name": "stale-bucket",
                "region": "us-west-2",
                "creation_date": _iso_days_ago(365),
                "size_bytes": _FIFTY_GB_BYTES,
            }
        ],
    })
    assert r.status_code == 200, r.text
    body = r.json()
    s3_opps = [o for o in body["opportunities"] if o.get("resource_id") == "stale-bucket"]
    assert len(s3_opps) == 1, f"expected one stale-bucket opp: {s3_opps}"

    opp = s3_opps[0]
    assert opp["kind"] == "zombie"
    assert opp["zombie_label"] == "stale_bucket"
    assert opp["service"] == "S3"
    assert opp["region"] == "us-west-2"
    assert opp["confidence"] == 0.6
    assert opp["risk"] == 0.4
    assert opp["max_cpu_pct"] == 0.0
    assert opp["data_days"] >= 90

    # Sanity-check the dollar math: 50 GB × $0.023/GB-month ≈ $1.15
    expected = round(50.0 * S3_STANDARD_GB_MONTH_USD, 2)
    assert opp["monthly_savings"] == expected, (
        f"expected {expected}, got {opp['monthly_savings']}"
    )
    assert opp["size_gb"] == 50.0


def test_s3_multiple_buckets() -> None:
    """Mix of empty / new / stale — only the stale one is flagged."""
    r = client.post("/analyze", json={
        "resources": [],
        "s3_buckets": [
            {
                "bucket_name": "empty-mix",
                "region": "us-east-1",
                "creation_date": _iso_days_ago(365),
                "size_bytes": 0,
            },
            {
                "bucket_name": "new-mix",
                "region": "us-east-1",
                "creation_date": _iso_days_ago(5),
                "size_bytes": _FIFTY_GB_BYTES,
            },
            {
                "bucket_name": "stale-mix",
                "region": "eu-west-1",
                "creation_date": _iso_days_ago(200),
                "size_bytes": _FIFTY_GB_BYTES,
            },
        ],
    })
    assert r.status_code == 200, r.text
    body = r.json()
    flagged = [
        o for o in body["opportunities"]
        if o.get("kind") == "zombie" and o.get("service") == "S3"
    ]
    assert len(flagged) == 1, f"expected exactly one stale S3 opp, got: {flagged}"
    assert flagged[0]["resource_id"] == "stale-mix"
    assert flagged[0]["region"] == "eu-west-1"

    # resource_count should reflect all 3 enumerated buckets.
    assert body["resource_count"] == 3


def test_analyze_accepts_only_s3_buckets() -> None:
    """analyze() must not 400 when only s3_buckets are provided (no EC2/EBS/RDS)."""
    r = client.post("/analyze", json={
        "resources": [],
        "s3_buckets": [
            {
                "bucket_name": "solo-bucket",
                "region": "us-east-1",
                "creation_date": _iso_days_ago(180),
                "size_bytes": _FIFTY_GB_BYTES,
            }
        ],
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["resource_count"] == 1
    assert body["opportunity_count"] >= 1
    kinds = [o["kind"] for o in body["opportunities"]]
    assert "zombie" in kinds
