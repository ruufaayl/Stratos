"""Instance catalog — AWS us-east-1 on-demand pricing snapshot.

In production we pull this live from the AWS Price List API. For Phase 1 we
ship a representative snapshot so the engine and tests are deterministic.

Prices are USD per hour, on-demand, Linux, us-east-1, January 2026 reference.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class InstanceSpec:
    """A row in the catalog."""

    name: str
    family: str       # "t3", "m5", "c5", "r5", ...
    vcpu: int
    mem_gib: float
    price_hr: float   # USD


# Compact catalog — enough variety for the rightsizer to find better fits.
# Ordered roughly by family then vCPU within family.
CATALOG: dict[str, InstanceSpec] = {
    s.name: s
    for s in [
        # Burstable
        InstanceSpec("t3.nano",    "t3", 2, 0.5,  0.0052),
        InstanceSpec("t3.micro",   "t3", 2, 1.0,  0.0104),
        InstanceSpec("t3.small",   "t3", 2, 2.0,  0.0208),
        InstanceSpec("t3.medium",  "t3", 2, 4.0,  0.0416),
        InstanceSpec("t3.large",   "t3", 2, 8.0,  0.0832),
        InstanceSpec("t3.xlarge",  "t3", 4, 16.0, 0.1664),
        InstanceSpec("t3.2xlarge", "t3", 8, 32.0, 0.3328),
        # General purpose
        InstanceSpec("m5.large",    "m5", 2,  8.0,  0.096),
        InstanceSpec("m5.xlarge",   "m5", 4,  16.0, 0.192),
        InstanceSpec("m5.2xlarge",  "m5", 8,  32.0, 0.384),
        InstanceSpec("m5.4xlarge",  "m5", 16, 64.0, 0.768),
        InstanceSpec("m5.8xlarge",  "m5", 32, 128.0, 1.536),
        # Compute optimized
        InstanceSpec("c5.large",   "c5", 2,  4.0,  0.085),
        InstanceSpec("c5.xlarge",  "c5", 4,  8.0,  0.170),
        InstanceSpec("c5.2xlarge", "c5", 8,  16.0, 0.340),
        InstanceSpec("c5.4xlarge", "c5", 16, 32.0, 0.680),
        # Memory optimized
        InstanceSpec("r5.large",   "r5", 2,  16.0, 0.126),
        InstanceSpec("r5.xlarge",  "r5", 4,  32.0, 0.252),
        InstanceSpec("r5.2xlarge", "r5", 8,  64.0, 0.504),
    ]
}


# Hours billed per month (730 = 365*24/12). Industry standard for monthly cost math.
HOURS_PER_MONTH = 730.0


def monthly_cost(price_hr: float) -> float:
    return price_hr * HOURS_PER_MONTH


def cheaper_alternatives(
    current: str,
    min_vcpu: int,
    min_mem_gib: float,
    same_family_only: bool = False,
) -> list[InstanceSpec]:
    """All catalog entries that meet vcpu/mem floors AND cost less than current."""
    if current not in CATALOG:
        return []
    cur = CATALOG[current]
    out = []
    for spec in CATALOG.values():
        if spec.name == current:
            continue
        if same_family_only and spec.family != cur.family:
            continue
        if spec.vcpu < min_vcpu or spec.mem_gib < min_mem_gib:
            continue
        if spec.price_hr >= cur.price_hr:
            continue
        out.append(spec)
    out.sort(key=lambda s: s.price_hr)
    return out
