"""Synthetic-telemetry fixtures.

The engine MUST be testable without real cloud data, otherwise we ship blind.
Every algorithm has a known-answer fixture here: we know the right answer
because we generated the input. If the algorithm disagrees with the fixture,
the algorithm is wrong (not the data).

Conventions:
  - 5-minute datapoints (matches CloudWatch resolution)
  - CPU % in [0, 100]
  - Seeds are explicit so tests are reproducible
"""

from __future__ import annotations

from datetime import datetime, timezone

import numpy as np

from .models import ResourceTelemetry

# Typical fleet sizes for tests
SAMPLES_PER_DAY = 288        # 24 * 60 / 5
DAYS_DEFAULT = 14            # two weeks of telemetry


# =============================================================================
# CPU TRACE GENERATORS
# Each returns an ndarray of CPU % values in [0, 100].
# =============================================================================

def cpu_idle(days: int = DAYS_DEFAULT, seed: int = 0) -> np.ndarray:
    """Resource that does effectively nothing. p99 well under any sane idle ceiling.

    We keep the mean very low (0.5%) and the noise tight (0.15) so the p99 is
    around 1% — well below the default 5% idle ceiling. This is what "truly
    abandoned" looks like in real telemetry.
    """
    n = days * SAMPLES_PER_DAY
    rng = np.random.default_rng(seed)
    return np.clip(rng.normal(0.5, 0.15, size=n), 0.0, 5.0)


def cpu_overprovisioned(
    days: int = DAYS_DEFAULT,
    p95_target: float = 25.0,
    seed: int = 1,
) -> np.ndarray:
    """Resource that does real work but at a fraction of its size.

    Designed for the rightsizer: p95 around `p95_target` so we know the
    "right" answer is to drop one tier in vCPU.
    """
    n = days * SAMPLES_PER_DAY
    rng = np.random.default_rng(seed)
    # Diurnal pattern: daily sine + small noise, scaled so p95 ≈ target.
    t = np.arange(n) / SAMPLES_PER_DAY                  # in days
    daily = (np.sin(2 * np.pi * t) + 1) / 2             # in [0, 1]
    raw = daily * (p95_target * 1.05) + rng.normal(0, 1.5, size=n)
    return np.clip(raw, 0.0, 100.0)


def cpu_well_sized(days: int = DAYS_DEFAULT, seed: int = 2) -> np.ndarray:
    """Resource running near healthy target (p95 around 60-70%). Should not be flagged."""
    n = days * SAMPLES_PER_DAY
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SAMPLES_PER_DAY
    daily = (np.sin(2 * np.pi * t) + 1) / 2
    raw = daily * 70.0 + 15.0 + rng.normal(0, 3.0, size=n)
    return np.clip(raw, 0.0, 100.0)


def cpu_spiky(
    days: int = DAYS_DEFAULT,
    base: float = 5.0,
    spike: float = 95.0,
    spike_prob: float = 0.005,
    seed: int = 3,
) -> np.ndarray:
    """Mostly idle but with rare bursts to ~spike%.

    The TEST for idle detection: AVERAGE-based scorers say "idle, kill it".
    A correct PEAK-based scorer says "the p99 is 95%, do NOT kill it".
    """
    n = days * SAMPLES_PER_DAY
    rng = np.random.default_rng(seed)
    series = rng.normal(base, 1.0, size=n)
    is_spike = rng.random(n) < spike_prob
    series[is_spike] = spike + rng.normal(0, 1.0, size=is_spike.sum())
    return np.clip(series, 0.0, 100.0)


# =============================================================================
# DAILY-COST GENERATORS (for anomaly detection)
# =============================================================================

def daily_cost_steady(
    days: int = 90,
    base: float = 1000.0,
    noise: float = 30.0,
    seed: int = 10,
) -> np.ndarray:
    """Healthy steady spend with mild day-to-day variation."""
    rng = np.random.default_rng(seed)
    return base + rng.normal(0, noise, size=days)


def daily_cost_with_spikes(
    days: int = 90,
    base: float = 1000.0,
    noise: float = 30.0,
    spike_days: tuple[int, ...] = (30, 60),
    spike_factor: float = 3.5,
    seed: int = 11,
) -> tuple[np.ndarray, set[int]]:
    """Steady spend with planted spike days.

    Returns (series, set of known-anomaly day indices). The detector should
    surface every day in the set and ideally nothing else.
    """
    series = daily_cost_steady(days=days, base=base, noise=noise, seed=seed)
    for d in spike_days:
        series[d] += base * spike_factor
    return series, set(spike_days)


def daily_cost_seasonal(
    days: int = 90,
    base: float = 1000.0,
    weekly_amp: float = 200.0,
    trend: float = 5.0,
    noise: float = 25.0,
    seed: int = 12,
) -> np.ndarray:
    """Spend with weekly seasonality + linear growth. For the forecaster (§6)."""
    rng = np.random.default_rng(seed)
    t = np.arange(days)
    weekly = weekly_amp * np.sin(2 * np.pi * t / 7.0)
    return base + trend * t + weekly + rng.normal(0, noise, size=days)


# =============================================================================
# TELEMETRY FACTORIES
# =============================================================================

def telemetry(
    resource_id: str,
    cpu: np.ndarray,
    resource_type: str = "m5.xlarge",
    hourly_cost: float = 0.192,
    region: str = "us-east-1",
    net_in: np.ndarray | None = None,
    net_out: np.ndarray | None = None,
) -> ResourceTelemetry:
    """Build a ResourceTelemetry from a CPU array + sensible defaults."""
    zeros = np.zeros_like(cpu)
    return ResourceTelemetry(
        resource_id=resource_id,
        service="EC2",
        resource_type=resource_type,
        region=region,
        cpu=cpu,
        hourly_cost=hourly_cost,
        net_in=zeros if net_in is None else net_in,
        net_out=zeros if net_out is None else net_out,
        launch_time=datetime(2025, 1, 1, tzinfo=timezone.utc),
    )


def cpu_stopped(days: int = DAYS_DEFAULT) -> np.ndarray:
    """Literally zero CPU — the instance is stopped."""
    return np.zeros(days * SAMPLES_PER_DAY, dtype=float)


def synthetic_fleet(seed: int = 100) -> list[ResourceTelemetry]:
    """A small heterogeneous fleet used by the proof harness and tests.

    Composition (11 VMs):
    - 1 stopped/zombie m5.4xlarge  (zero CPU, $562/mo waste — top of list)
    - 3 idle m5.xlarge             (should each be flagged, ~$140/mo savings)
    - 2 overprovisioned m5.2xlarge (should be rightsized down)
    - 2 spiky m5.xlarge            (should NOT be flagged)
    - 2 well-sized m5.large        (should NOT be flagged)

    The zombie sits at the top because it has zero operational risk and the
    highest dollar waste — exactly the right ranking logic.
    """
    fleet: list[ResourceTelemetry] = []

    # Zombie: a large stopped instance still incurring volume costs.
    fleet.append(
        telemetry(
            "i-zombie-000",
            cpu=cpu_stopped(days=DAYS_DEFAULT),
            resource_type="m5.4xlarge",
            hourly_cost=0.768,  # $560/mo in attached volumes even when stopped
        )
    )

    for i in range(3):
        fleet.append(
            telemetry(
                f"i-idle-{i:03d}",
                cpu=cpu_idle(seed=seed + i),
                resource_type="m5.xlarge",
                hourly_cost=0.192,
            )
        )
    for i in range(2):
        fleet.append(
            telemetry(
                f"i-overprov-{i:03d}",
                cpu=cpu_overprovisioned(p95_target=20.0, seed=seed + 10 + i),
                resource_type="m5.2xlarge",
                hourly_cost=0.384,
            )
        )
    for i in range(2):
        # Spiky resources DO have network traffic during spikes — make sure
        # idle detector correctly refuses to kill them.
        cpu = cpu_spiky(seed=seed + 20 + i)
        net = np.where(cpu > 50, 50_000.0, 100.0)   # bytes/s
        fleet.append(
            telemetry(
                f"i-spiky-{i:03d}",
                cpu=cpu,
                resource_type="m5.xlarge",
                hourly_cost=0.192,
                net_in=net,
                net_out=net * 0.5,
            )
        )
    for i in range(2):
        fleet.append(
            telemetry(
                f"i-healthy-{i:03d}",
                cpu=cpu_well_sized(seed=seed + 30 + i),
                resource_type="m5.large",
                hourly_cost=0.096,
            )
        )
    return fleet
