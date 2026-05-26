"""Stratos engine — FastAPI service entrypoint.

Phase 0: /health.
Phase 1: /analyze — runs the full ranked-opportunity pipeline.

Run locally:
    uvicorn engine.main:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from typing import Any, AsyncIterator

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from . import __version__, fixtures
from .anomaly import detect_cost_anomalies
from .catalog import CATALOG, HOURS_PER_MONTH
from .commitment import optimal_commitment
from .forecast import forecast_spend
from .idle import find_idle, idle_score
from .models import ResourceTelemetry
from .rightsizing import find_rightsizing, recommend_rightsizing
from .zombie import zombie_score, find_zombies, SAMPLES_PER_DAY

# Typical AWS RI/SP discount vs on-demand — 38-42% savings is the well-known
# industry range. We use 40% as a conservative default so every commitment
# recommendation survives scrutiny against real AWS pricing pages.
_RI_SAVINGS_FRACTION = 0.40  # r_committed = r_ondemand * (1 - _RI_SAVINGS_FRACTION)

# EBS pricing snapshot — USD per GB-month, us-east-1, Jan 2026 reference.
# Source: aws.amazon.com/ebs/pricing. The engine owns this catalog so the
# TS side does no dollar arithmetic (architecture law).
EBS_GB_MONTH_USD: dict[str, float] = {
    "gp3":      0.080,
    "gp2":      0.100,
    "io1":      0.125,
    "io2":      0.125,
    "st1":      0.045,
    "sc1":      0.015,
    "standard": 0.050,
}
EBS_DEFAULT_GB_MONTH_USD = 0.100  # gp2 rate — sensible fallback

# RDS pricing snapshot (D10-B) — USD/hr by instance-class family prefix.
# Conservative flat per-class values, us-east-1, single-AZ, MySQL/Postgres
# reference. Multi-AZ doubles compute; large storage adds materially. The
# engine owns this catalog so TS code does no dollar arithmetic.
#
# Source: aws.amazon.com/rds/pricing/, Jan 2026 reference. These are
# deliberately rough — we want a defensible savings figure that survives a
# customer comparing to their bill, not a per-cent-accurate forecast.
RDS_HOURLY_USD: dict[str, float] = {
    # Burstable
    "db.t3.micro":   0.017,
    "db.t3.small":   0.034,
    "db.t3.medium":  0.068,
    "db.t3.large":   0.136,
    "db.t3.xlarge":  0.272,
    "db.t3.2xlarge": 0.544,
    "db.t4g.micro":  0.016,
    "db.t4g.small":  0.032,
    "db.t4g.medium": 0.065,
    "db.t4g.large":  0.129,
    # General purpose
    "db.m5.large":    0.171,
    "db.m5.xlarge":   0.342,
    "db.m5.2xlarge":  0.684,
    "db.m5.4xlarge":  1.368,
    "db.m6g.large":   0.155,
    "db.m6g.xlarge":  0.310,
    "db.m6g.2xlarge": 0.620,
    # Memory optimized (where the real waste lives)
    "db.r5.large":    0.240,
    "db.r5.xlarge":   0.480,
    "db.r5.2xlarge":  0.960,
    "db.r5.4xlarge":  1.920,
    "db.r5.8xlarge":  3.840,
    "db.r6g.large":   0.226,
    "db.r6g.xlarge":  0.452,
    "db.r6g.2xlarge": 0.904,
    "db.r6g.4xlarge": 1.808,
}
RDS_DEFAULT_HOURLY_USD = 0.171  # db.m5.large rate — sensible fallback

# S3 Standard pricing — USD per GB-month, us-east-1, Jan 2026 reference.
# Source: aws.amazon.com/s3/pricing. Engine owns catalog (architecture law).
S3_STANDARD_GB_MONTH_USD = 0.023
S3_ZOMBIE_MIN_DAYS = 90  # Only flag buckets older than this as suspects.

STARTED_AT = time.time()

app = FastAPI(
    title="Stratos Engine",
    version=__version__,
    description=(
        "The analytical brain. Python owns truth; Claude owns language. "
        "Every dollar this service returns is computed deterministically."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Schemas (Pydantic)
# =============================================================================


class TelemetryIn(BaseModel):
    """Serialized resource telemetry the engine consumes."""

    resource_id: str
    service: str = "EC2"
    resource_type: str
    region: str = "us-east-1"
    cpu: list[float] = Field(..., description="CPU % series in [0, 100]")
    hourly_cost: float
    net_in: list[float] | None = None
    net_out: list[float] | None = None
    mem: list[float] | None = None
    tags: dict[str, str] = Field(default_factory=dict)


class EbsVolumeIn(BaseModel):
    """An unattached EBS volume (zombie candidate).

    Unattached volumes by definition have zero utilization — every dollar
    billed for them is waste. We synthesize zero-CPU telemetry and dispatch
    through the existing zombie pipeline so the math path stays unified.
    """

    volume_id: str
    state: str = "available"  # "available" | "error" | ...
    size_gb: float
    volume_type: str = "gp2"  # "gp3" | "gp2" | "io1" | "io2" | "st1" | "sc1"
    region: str = "us-east-1"
    create_time: str | None = None


class RdsInstanceIn(BaseModel):
    """An RDS DB instance (D10-B) — idle-detection candidate.

    Idle RDS is one of the biggest single waste lines on an AWS account.
    We project each instance as standard ResourceTelemetry (CPU only for
    now) and run idle.detect() over it. hourly_cost is sourced from
    RDS_HOURLY_USD here — the TS side passes 0 and Python owns truth.
    """

    instance_id: str
    instance_class: str           # e.g. "db.r5.2xlarge"
    engine: str = "unknown"       # "mysql" | "postgres" | "aurora-*" | ...
    multi_az: bool = False
    storage_gb: float = 0.0
    region: str = "us-east-1"
    cpu_utilization_pct: list[float] = Field(
        ..., description="CPU % series in [0, 100] (RDS CPUUtilization)"
    )
    hourly_cost: float = 0.0      # ignored; engine owns the catalog


class S3BucketIn(BaseModel):
    """An S3 bucket. Engine scores size + age for zombie candidates."""

    bucket_name: str
    region: str = "us-east-1"
    creation_date: str  # ISO 8601
    size_bytes: float = 0.0


class AnalyzeRequest(BaseModel):
    resources: list[TelemetryIn]
    daily_cost: list[float] | None = Field(
        None, description="Optional daily-spend series for anomaly detection"
    )
    ebs_volumes: list[EbsVolumeIn] = Field(
        default_factory=list,
        description="Unattached EBS volumes to scan for zombie waste",
    )
    rds_instances: list[RdsInstanceIn] = Field(
        default_factory=list,
        description="RDS DB instances to scan for idle waste (D10-B)",
    )
    s3_buckets: list[S3BucketIn] = Field(
        default_factory=list,
        description="S3 buckets to score for zombie waste (D12-A)",
    )


class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_s: float
    env: str


# =============================================================================
# Routes — meta
# =============================================================================


@app.get("/health", response_model=HealthResponse, tags=["meta"])
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=__version__,
        uptime_s=round(time.time() - STARTED_AT, 3),
        env=os.environ.get("STRATOS_ENV", "dev"),
    )


@app.get("/", tags=["meta"])
def root() -> dict[str, Any]:
    return {
        "service": "stratos-engine",
        "version": __version__,
        "docs": "/docs",
        "health": "/health",
        "analyze": "POST /analyze",
    }


# =============================================================================
# Routes — analysis
# =============================================================================


def _to_telemetry(t: TelemetryIn) -> ResourceTelemetry:
    return ResourceTelemetry(
        resource_id=t.resource_id,
        service=t.service,
        resource_type=t.resource_type,
        region=t.region,
        cpu=np.asarray(t.cpu, dtype=float),
        net_in=np.asarray(t.net_in, dtype=float) if t.net_in is not None else None,
        net_out=np.asarray(t.net_out, dtype=float) if t.net_out is not None else None,
        mem=np.asarray(t.mem, dtype=float) if t.mem is not None else None,
        hourly_cost=t.hourly_cost,
        tags=t.tags,
    )


# Span just over zombie's MIN_DAYS_COVERAGE so the heuristic accepts it.
_EBS_SAMPLE_DAYS = 8
_EBS_SAMPLES = _EBS_SAMPLE_DAYS * SAMPLES_PER_DAY


def _ebs_hourly_cost(volume_type: str, size_gb: float) -> float:
    """Convert (type, size) into hourly USD using the EBS catalog above."""
    gb_month = EBS_GB_MONTH_USD.get(volume_type.lower(), EBS_DEFAULT_GB_MONTH_USD)
    monthly = gb_month * size_gb
    if HOURS_PER_MONTH <= 0:
        return 0.0
    return monthly / HOURS_PER_MONTH


def _rds_hourly_cost(instance_class: str, multi_az: bool = False) -> float:
    """Look up RDS hourly cost from the catalog (with Multi-AZ multiplier)."""
    base = RDS_HOURLY_USD.get(instance_class.lower(), RDS_DEFAULT_HOURLY_USD)
    # Multi-AZ roughly doubles the compute charge — billed for the standby too.
    return base * (2.0 if multi_az else 1.0)


def _rds_to_telemetry(r: RdsInstanceIn) -> ResourceTelemetry:
    """Project an RDS instance into ResourceTelemetry for idle.detect().

    CPU is already in 0..100 (RDS CPUUtilization). hourly_cost is sourced
    from the engine catalog — Python owns truth.
    """
    return ResourceTelemetry(
        resource_id=r.instance_id,
        service="RDS",
        resource_type=r.instance_class,
        region=r.region,
        cpu=np.asarray(r.cpu_utilization_pct, dtype=float),
        hourly_cost=_rds_hourly_cost(r.instance_class, r.multi_az),
        tags={
            "engine": r.engine,
            "multi_az": str(r.multi_az),
            "storage_gb": str(r.storage_gb),
        },
    )


def _ebs_to_telemetry(v: EbsVolumeIn) -> ResourceTelemetry:
    """Project an unattached EBS volume as zero-utilization telemetry.

    The zombie heuristic flags max_cpu == 0 with sufficient coverage as a
    definite zombie — exactly what an unattached volume is by definition.
    """
    return ResourceTelemetry(
        resource_id=v.volume_id,
        service="EBS",
        resource_type=f"ebs:{v.volume_type}",
        region=v.region,
        cpu=np.zeros(_EBS_SAMPLES, dtype=float),
        hourly_cost=_ebs_hourly_cost(v.volume_type, v.size_gb),
        tags={
            "size_gb": str(v.size_gb),
            "state": v.state,
            "volume_type": v.volume_type,
        },
    )


def _s3_zombie_opportunities(buckets: list[S3BucketIn]) -> list[dict[str, Any]]:
    """Score S3 buckets for zombie waste.

    Heuristic: bucket with size_bytes > 0 AND creation_date > S3_ZOMBIE_MIN_DAYS ago
    → stale zombie candidate. Monthly savings = deletion of the whole bucket.
    Low confidence (0.6) because we can't see access patterns without S3 access logs.
    """
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc)
    opps: list[dict[str, Any]] = []
    for b in buckets:
        if b.size_bytes <= 0:
            continue  # Empty bucket costs nothing — skip.
        try:
            created = datetime.datetime.fromisoformat(
                b.creation_date.replace("Z", "+00:00")
            )
        except (ValueError, AttributeError):
            continue
        age_days = (now - created).days
        if age_days < S3_ZOMBIE_MIN_DAYS:
            continue  # Too new to call zombie.
        size_gb = b.size_bytes / (1024 ** 3)
        monthly_cost = size_gb * S3_STANDARD_GB_MONTH_USD
        if monthly_cost < 0.01:
            continue  # Under 1 cent/month — not worth surfacing.
        opps.append({
            "kind": "zombie",
            "resource_id": b.bucket_name,
            "zombie_label": "stale_bucket",
            "monthly_savings": round(monthly_cost, 2),
            "risk": 0.4,  # Moderate risk — we can't confirm last-accessed date.
            "confidence": 0.6,
            "max_cpu_pct": 0.0,
            "data_days": float(age_days),
            "service": "S3",
            "region": b.region,
            "size_gb": round(size_gb, 3),
        })
    return opps


def _commitment_opportunities(fleet: list[ResourceTelemetry]) -> list[dict[str, Any]]:
    """Newsvendor-optimal commitment recommendations grouped by instance type.

    For each EC2 instance type with enough CPU samples (≥24), we synthesize
    an hourly usage series by treating each instance's CPU fraction (0-1) as
    its usage intensity (one fully utilized instance = 1.0 unit). The on-demand
    rate comes from the catalog; committed rate uses the industry-standard 40%
    RI/SP discount. Only instances with a catalog entry are eligible — unknown
    types are skipped gracefully.

    Non-fatal: any per-type error is swallowed so it never blocks the pipeline.
    """
    from collections import defaultdict

    by_type: dict[str, list[ResourceTelemetry]] = defaultdict(list)
    for t in fleet:
        if t.service == "EC2" and t.resource_type in CATALOG:
            by_type[t.resource_type].append(t)

    commitments: list[dict[str, Any]] = []
    for instance_type, group in by_type.items():
        try:
            spec = CATALOG[instance_type]
            r_od = spec.price_hr
            r_c = r_od * (1.0 - _RI_SAVINGS_FRACTION)

            # Build an hourly usage series: concatenate each instance's CPU
            # fraction (0-1) as a proxy for instantaneous utilization units.
            usage_parts = [t.cpu / 100.0 for t in group if t.cpu.size >= 24]
            if not usage_parts:
                continue
            hourly_usage = np.concatenate(usage_parts)
            if hourly_usage.size < 24:
                continue

            opp = optimal_commitment(
                hourly_usage,
                r_ondemand=r_od,
                r_committed=r_c,
            )
            if opp["monthly_savings"] <= 0:
                continue

            opp["resource_id"] = instance_type
            opp["instance_count"] = len(group)
            commitments.append(opp)
        except Exception:
            # Non-fatal: skip this instance type on any error.
            continue

    return commitments


@app.post("/analyze", tags=["analysis"])
def analyze(req: AnalyzeRequest) -> dict[str, Any]:
    """Run the full ranked-opportunity pipeline against a fleet.

    Algorithms run in order:
      1. zombie (stopped/near-stopped — highest confidence)
      2. idle (geometric-mean CPU/net)
      3. rightsize (p95 + headroom + risk score)
      4. anomaly (EWMA bands, if daily_cost provided)
      5. commitment (newsvendor RI/SP gaps, grouped by instance type)

    Output is sorted by monthly_savings descending — the dollar headline rules.
    """
    if not req.resources and not req.ebs_volumes and not req.rds_instances and not req.s3_buckets:
        raise HTTPException(
            status_code=400,
            detail="resources, ebs_volumes, rds_instances, or s3_buckets must not be empty",
        )

    fleet = [_to_telemetry(r) for r in req.resources]

    opportunities: list[dict[str, Any]] = []

    # Priority order: zombie → idle → rightsize. A stopped machine needs
    # termination advice, not a downsize recommendation.
    zombie_ids: set[str] = set()
    for t in fleet:
        opp = zombie_score(t)
        if opp is not None:
            opportunities.append(opp)
            zombie_ids.add(t.resource_id)

    # EBS unattached volumes — synthetic zero-CPU telemetry → zombie pipeline.
    # Volumes never participate in idle/rightsize: they aren't compute.
    ebs_count = 0
    for vol in req.ebs_volumes:
        ebs_telem = _ebs_to_telemetry(vol)
        ebs_count += 1
        opp = zombie_score(ebs_telem)
        if opp is not None:
            opportunities.append(opp)

    # RDS instances (D10-B). Idle detection only; an "idle" RDS is the
    # marquee waste category (idle db.r5.4xlarge ≈ $1,800/mo). We do not
    # run zombie or rightsize on RDS yet — those need engine-specific
    # heuristics (Aurora vs MySQL vs Postgres differ enough that we'd
    # rather ship narrow + accurate than broad + wrong).
    rds_count = 0
    for rds in req.rds_instances:
        rds_telem = _rds_to_telemetry(rds)
        if rds_telem.cpu.size == 0:
            continue  # No CPU history; idle_score would raise.
        rds_count += 1
        opp = idle_score(rds_telem)
        if opp["idle_score"] >= 0.7:
            opportunities.append(opp)

    # S3 zombie buckets (D12-A). Age + size heuristic; confidence 0.6 because
    # we can't see access patterns without S3 access logs.
    s3_count = len(req.s3_buckets)
    opportunities.extend(_s3_zombie_opportunities(req.s3_buckets))

    idle_ids: set[str] = set()
    for t in fleet:
        if t.resource_id in zombie_ids:
            continue
        opp = idle_score(t)
        if opp["idle_score"] >= 0.7:
            opportunities.append(opp)
            idle_ids.add(t.resource_id)

    for t in fleet:
        if t.resource_id in zombie_ids or t.resource_id in idle_ids:
            continue
        opp = recommend_rightsizing(t)
        if opp is not None and opp["monthly_savings"] > 0:
            opportunities.append(opp)

    if req.daily_cost is not None:
        daily = np.asarray(req.daily_cost, dtype=float)
        opportunities.extend(detect_cost_anomalies(daily))

    # Commitment gap analysis (newsvendor RI/SP recommendations).
    # Grouped by instance type; non-fatal if it fails for any type.
    try:
        opportunities.extend(_commitment_opportunities(fleet))
    except Exception:
        pass  # non-fatal — commitment failures never block the pipeline

    opportunities.sort(key=lambda o: o.get("monthly_savings", 0.0), reverse=True)

    total_monthly_waste = round(
        sum(o.get("monthly_savings", 0.0) for o in opportunities), 2
    )

    return {
        "resource_count": len(fleet) + ebs_count + rds_count + s3_count,
        "opportunity_count": len(opportunities),
        "total_monthly_waste": total_monthly_waste,
        "opportunities": opportunities,
    }


# =============================================================================
# Routes — proof (public demo, no auth)
# =============================================================================


@app.get("/proof/synthetic", tags=["proof"])
def proof_synthetic() -> dict[str, Any]:
    """Run the engine on the bundled synthetic fleet.

    This is the public demo path — no auth, no DB write. Always returns the
    same numbers (deterministic seeds), which is exactly what we want: a
    stranger lands on /proof and sees the same headline we screenshotted.
    """
    from .catalog import HOURS_PER_MONTH

    fleet = fixtures.synthetic_fleet()

    opportunities: list[dict[str, Any]] = []
    zombie_ids: set[str] = set()
    idle_ids: set[str] = set()
    # Track per-resource savings for the cost-map waste intensity.
    savings_by_id: dict[str, float] = {}

    for t in fleet:
        opp = zombie_score(t)
        if opp is not None:
            opportunities.append(opp)
            zombie_ids.add(t.resource_id)
            savings_by_id[t.resource_id] = opp["monthly_savings"]

    for t in fleet:
        if t.resource_id in zombie_ids:
            continue
        opp = idle_score(t)
        if opp["idle_score"] >= 0.7:
            opportunities.append(opp)
            idle_ids.add(t.resource_id)
            savings_by_id[t.resource_id] = opp["monthly_savings"]
    for t in fleet:
        if t.resource_id in zombie_ids or t.resource_id in idle_ids:
            continue
        opp = recommend_rightsizing(t)
        if opp is not None and opp["monthly_savings"] > 0:
            opportunities.append(opp)
            savings_by_id[t.resource_id] = opp["monthly_savings"]

    # Daily-cost anomaly detection on a planted-spike series.
    series, planted = fixtures.daily_cost_with_spikes(
        days=90, spike_days=(30, 60), spike_factor=4.0
    )
    anoms = detect_cost_anomalies(series)
    opportunities.extend(anoms)

    # Quarter forecast on a seasonal series (for the Pulse "forecast" tile).
    seasonal = fixtures.daily_cost_seasonal(days=120, seed=12)
    fc = forecast_spend(seasonal, horizon=90)

    opportunities.sort(key=lambda o: o.get("monthly_savings", 0.0), reverse=True)
    total = round(sum(o.get("monthly_savings", 0.0) for o in opportunities), 2)

    # Per-resource cost-map nodes — id + monthly cost + waste intensity in [0,1].
    cost_map = []
    for t in fleet:
        monthly_cost = round(t.hourly_cost * HOURS_PER_MONTH, 2)
        savings = savings_by_id.get(t.resource_id, 0.0)
        waste = round(min(1.0, savings / monthly_cost) if monthly_cost else 0.0, 3)
        cost_map.append({
            "id": t.resource_id,
            "resource_type": t.resource_type,
            "monthly_cost": monthly_cost,
            "monthly_savings": round(savings, 2),
            "waste_intensity": waste,
        })

    return {
        "resource_count": len(fleet),
        "opportunity_count": len(opportunities),
        "total_monthly_waste": total,
        "opportunities": opportunities,
        "daily_cost_series": [round(float(x), 2) for x in series.tolist()],
        "planted_anomaly_days": sorted(planted),
        "forecast": fc,
        "cost_map": cost_map,
        "source": "Synthetic deterministic fleet (engine.fixtures.synthetic_fleet)",
    }


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.get("/proof/stream", tags=["proof"])
async def proof_stream() -> StreamingResponse:
    """Server-Sent Events: walk the synthetic fleet, emit findings live.

    The waste counter on the public demo ticks up as each VM is analyzed.
    Roughly 200ms per VM to make the animation visible — the actual engine
    runs in milliseconds, this is theater on top of real math.
    """

    async def gen() -> AsyncIterator[str]:
        fleet = fixtures.synthetic_fleet()
        yield _sse("start", {"total": len(fleet)})

        running_total = 0.0
        zombie_ids: set[str] = set()
        idle_ids: set[str] = set()

        # Pass 0: zombie scan (stopped/near-stopped — highest confidence, lowest risk)
        for i, t in enumerate(fleet):
            opp = zombie_score(t)
            if opp is not None:
                running_total += opp["monthly_savings"]
                zombie_ids.add(t.resource_id)
                yield _sse(
                    "opportunity",
                    {
                        "running_total": round(running_total, 2),
                        "index": i,
                        "opportunity": opp,
                    },
                )
            else:
                yield _sse("scanned", {"index": i, "resource_id": t.resource_id})
            await asyncio.sleep(0.15)

        # Pass 1: idle scan
        for i, t in enumerate(fleet):
            if t.resource_id in zombie_ids:
                continue
            opp = idle_score(t)
            if opp["idle_score"] >= 0.7:
                running_total += opp["monthly_savings"]
                idle_ids.add(t.resource_id)
                yield _sse(
                    "opportunity",
                    {
                        "running_total": round(running_total, 2),
                        "index": i,
                        "opportunity": opp,
                    },
                )
            else:
                yield _sse("scanned", {"index": i, "resource_id": t.resource_id})
            await asyncio.sleep(0.2)

        # Pass 2: rightsize scan
        for i, t in enumerate(fleet):
            if t.resource_id in zombie_ids or t.resource_id in idle_ids:
                continue
            opp = recommend_rightsizing(t)
            if opp is not None and opp["monthly_savings"] > 0:
                running_total += opp["monthly_savings"]
                yield _sse(
                    "opportunity",
                    {
                        "running_total": round(running_total, 2),
                        "index": len(fleet) + i,
                        "opportunity": opp,
                    },
                )
            await asyncio.sleep(0.15)

        # Pass 3: anomalies on the daily-cost series
        series, _ = fixtures.daily_cost_with_spikes(
            days=90, spike_days=(30, 60), spike_factor=4.0
        )
        anoms = detect_cost_anomalies(series)
        for opp in anoms:
            yield _sse(
                "opportunity",
                {
                    "running_total": round(running_total, 2),
                    "opportunity": opp,
                },
            )
            await asyncio.sleep(0.1)

        yield _sse("done", {"total_monthly_waste": round(running_total, 2)})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )
