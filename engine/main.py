"""Stratos engine — FastAPI service entrypoint.

Phase 0: /health only. Phase 1 adds /analyze (ENGINE.md §7).

Run locally:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os
import time
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import __version__

STARTED_AT = time.time()

app = FastAPI(
    title="Stratos Engine",
    version=__version__,
    description="The analytical brain. Python owns truth; Claude owns language.",
)

# Permissive CORS for local dev; tighten in production (we proxy via Next.js).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_s: float
    env: str


@app.get("/health", response_model=HealthResponse, tags=["meta"])
def health() -> HealthResponse:
    """Liveness + version probe. Cheap; used by Vercel rewrite + uptime checks."""
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
    }
