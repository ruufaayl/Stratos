# Stratos Engine

The analytical brain. **Python owns truth. Claude owns language.**

See [ENGINE.md](../ENGINE.md) for the math.

## Setup

```powershell
# from C:\dev\stratos
py -m venv engine\.venv
engine\.venv\Scripts\python -m pip install --upgrade pip
engine\.venv\Scripts\python -m pip install -r engine\requirements.txt
```

## Run

```powershell
# from C:\dev\stratos
engine\.venv\Scripts\python -m uvicorn engine.main:app --reload --port 8000
# →  http://localhost:8000/health
# →  http://localhost:8000/docs   (Swagger UI)
```

## Test

```powershell
engine\.venv\Scripts\python -m pytest engine\tests
```

## Layout

```
engine/
├── main.py              FastAPI service entrypoint  ← Phase 0
├── models.py            ResourceTelemetry + shared types
├── idle.py              Algorithm 1 — idle detection      (Phase 1)
├── rightsizing.py       Algorithm 2 — p95 + risk score    (Phase 1)
├── anomaly.py           Algorithm 3 — EWMA bands          (Phase 1)
├── commitment.py        Algorithm 4 — newsvendor          (Phase 2)
├── forecast.py          Algorithm 5 — Holt-Winters + √t   (Phase 2)
└── tests/               pytest, runs against synthetic fixtures first
```

## The contract with the web app

The engine is a stateless FastAPI service. Next.js calls it over HTTPS at
`ENGINE_URL`. It must NEVER call back into Next.js or hold session state.
All persistence is the web app's responsibility — the engine just computes.
