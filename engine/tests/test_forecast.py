"""Tests for engine/forecast.py."""

from __future__ import annotations

import numpy as np
import pytest

from engine import fixtures
from engine.forecast import forecast_spend


def test_forecast_shape_matches_horizon() -> None:
    series = fixtures.daily_cost_seasonal(days=120, seed=12)
    res = forecast_spend(series, horizon=30)
    assert len(res["forecast"]) == 30
    assert len(res["upper"]) == 30
    assert len(res["lower"]) == 30


def test_forecast_band_widens_with_time() -> None:
    """uncertainty(t) ∝ √t — last value must be larger than first."""
    series = fixtures.daily_cost_seasonal(days=120, seed=12)
    res = forecast_spend(series, horizon=60)
    first_width = res["upper"][0] - res["lower"][0]
    last_width = res["upper"][-1] - res["lower"][-1]
    assert last_width > first_width, "band must widen with horizon"


def test_lower_never_negative() -> None:
    series = fixtures.daily_cost_seasonal(days=120, seed=12)
    res = forecast_spend(series, horizon=90)
    assert all(x >= 0.0 for x in res["lower"])


def test_forecast_tracks_trend() -> None:
    """Series with positive linear trend → quarterly total > trailing 90 actuals."""
    series = fixtures.daily_cost_seasonal(days=120, trend=10.0, seed=12)
    res = forecast_spend(series, horizon=90)
    trailing = float(series[-90:].sum())
    assert res["projected_quarter_total"] > trailing


def test_validates_inputs() -> None:
    with pytest.raises(ValueError):
        forecast_spend(np.zeros((2, 5)), horizon=10)
    with pytest.raises(ValueError):
        forecast_spend(np.zeros(5), horizon=10)   # too few obs for weekly seasonal
