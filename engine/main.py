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
from .catalog import HOURS_PER_MONTH
from .forecast import forecast_spend
from .idle import find_idle, idle_score
from .models import ResourceTelemetry
from .rightsizing import find_rightsizing, recommend_rightsizing
from .zombie import zombie_score, find_zombies, SAMPLES_PER_DAY

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


class AnalyzeRequest(BaseModel):
    resources: list[TelemetryIn]
    daily_cost: list[float] | None = Field(
        None, description="Optional daily-spend series for anomaly detection"
    )
    ebs_volumes: list[EbsVolumeIn] = Field(
        default_factory=list,
        description="Unattached EBS volumes to scan for zombie waste",
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


@app.post("/analyze", tags=["analysis"])
def analyze(req: AnalyzeRequest) -> dict[str, Any]:
    """Run the full ranked-opportunity pipeline against a fleet.

    Algorithms run in order:
      1. idle (geometric-mean CPU/net)
      2. rightsize (p95 + headroom + risk score)
      3. anomaly (EWMA bands, if daily_cost provided)

    Output is sorted by monthly_savings descending — the dollar headline rules.
    """
    if not req.resources and not req.ebs_volumes:
        raise HTTPException(
            status_code=400,
            detail="resources or ebs_volumes must not be empty",
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

    opportunities.sort(key=lambda o: o.get("monthly_savings", 0.0), reverse=True)

    total_monthly_waste = round(
        sum(o.get("monthly_savings", 0.0) for o in opportunities), 2
    )

    return {
        "resource_count": len(fleet) + ebs_count,
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
