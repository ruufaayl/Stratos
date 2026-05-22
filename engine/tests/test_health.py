"""Smoke test for the engine skeleton."""

from fastapi.testclient import TestClient

from engine.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "version" in body
    assert body["uptime_s"] >= 0


def test_root_lists_endpoints() -> None:
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["service"] == "stratos-engine"
