"""Stratos engine — FastAPI service entrypoint.

Phase 0: /health.
Phase 1: /analyze — runs the full ranked-opportunity pipeline.

Run locally:
    uvicorn engine.main:app --reload --port 8000
"""

from __future__ import annotations

import os
import time
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import __version__, fixtures
from .anomaly import detect_cost_anomalies
from .forecast import forecast_spend
from .idle import find_idle, idle_score
from .models import ResourceTelemetry
from .rightsizing import find_rightsizing, recommend_rightsizing

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


class AnalyzeRequest(BaseModel):
    resources: list[TelemetryIn]
    daily_cost: list[float] | None = Field(
        None, description="Optional daily-spend series for anomaly detection"
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


@app.post("/analyze", tags=["analysis"])
def analyze(req: AnalyzeRequest) -> dict[str, Any]:
    """Run the full ranked-opportunity pipeline against a fleet.

    Algorithms run in order:
      1. idle (geometric-mean CPU/net)
      2. rightsize (p95 + headroom + risk score)
      3. anomaly (EWMA bands, if daily_cost provided)

    Output is sorted by monthly_savings descending — the dollar headline rules.
    """
    if not req.resources:
        raise HTTPException(status_code=400, detail="resources must not be empty")

    fleet = [_to_telemetry(r) for r in req.resources]

    opportunities: list[dict[str, Any]] = []

    # We score every resource for both idle and rightsize. A resource that's
    # 0.95 idle gets the idle recommendation; the rightsizer's response on the
    # same input is suppressed (downsizing an already-idle box is the wrong call).
    idle_ids: set[str] = set()
    for t in fleet:
        opp = idle_score(t)
        if opp["idle_score"] >= 0.7:
            opportunities.append(opp)
            idle_ids.add(t.resource_id)

    for t in fleet:
        if t.resource_id in idle_ids:
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
        "resource_count": len(fleet),
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
    fleet = fixtures.synthetic_fleet()

    opportunities: list[dict[str, Any]] = []
    idle_ids: set[str] = set()
    for t in fleet:
        opp = idle_score(t)
        if opp["idle_score"] >= 0.7:
            opportunities.append(opp)
            idle_ids.add(t.resource_id)
    for t in fleet:
        if t.resource_id in idle_ids:
            continue
        opp = recommend_rightsizing(t)
        if opp is not None and opp["monthly_savings"] > 0:
            opportunities.append(opp)

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

    return {
        "resource_count": len(fleet),
        "opportunity_count": len(opportunities),
        "total_monthly_waste": total,
        "opportunities": opportunities,
        "daily_cost_series": [round(float(x), 2) for x in series.tolist()],
        "planted_anomaly_days": sorted(planted),
        "forecast": fc,
        "source": "Synthetic deterministic fleet (engine.fixtures.synthetic_fleet)",
    }
