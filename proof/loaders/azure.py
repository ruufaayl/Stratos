"""Azure Public Dataset V1 loader.

The real trace is 117GB across 135 files referenced in
`_harvest/AzurePublicDataset/AzurePublicDatasetV1Links.txt` (SAS URLs).
Download a single file with curl/aria2, drop it under `data/azure/`, and
this loader normalizes it into a ResourceTelemetry per VM.

Schema (Azure V1 vmtable CSV — see _harvest/AzurePublicDataset/AzurePublicDatasetV1.md):
    vmtable.csv:    vm_id, sub_id, deployment_id, vm_created, vm_deleted,
                    max_cpu, avg_cpu, p95_max_cpu, vm_category,
                    vm_virtualcore_count_bucket, vm_memory_bucket

    vm_cpu_readings-*.csv:
                    timestamp, vm_id, min_cpu, max_cpu, avg_cpu

Attribution (CC-BY 4.0): "Hadary, Marcus, et al. 'Protean: VM Allocation
Service at Scale.' OSDI 2020." Recorded in NOTICE when this loader is used.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from engine.models import ResourceTelemetry

# AWS us-east-1 on-demand rate for a vCPU-equivalent box. The proof harness
# narrates this explicitly: "real Azure utilization, priced at AWS rates."
AWS_RATE_PER_VCPU_HR = 0.0416   # ~t3 class baseline


def load_vm_cpu_readings(path: str | Path) -> pd.DataFrame:
    """Read one vm_cpu_readings-*.csv from Azure V1."""
    cols = ["timestamp", "vm_id", "min_cpu", "max_cpu", "avg_cpu"]
    df = pd.read_csv(path, header=None, names=cols)
    # timestamp is seconds since trace start
    return df


def load_vm_table(path: str | Path) -> pd.DataFrame:
    """Read vmtable.csv (the metadata sidecar)."""
    cols = [
        "vm_id", "sub_id", "deployment_id",
        "vm_created", "vm_deleted",
        "max_cpu", "avg_cpu", "p95_max_cpu",
        "vm_category", "vm_virtualcore_count_bucket", "vm_memory_bucket",
    ]
    return pd.read_csv(path, header=None, names=cols)


def to_telemetry(
    df_readings: pd.DataFrame,
    vm_id: str,
    *,
    assumed_vcpu: int = 4,
    aws_rate_per_vcpu_hr: float = AWS_RATE_PER_VCPU_HR,
) -> ResourceTelemetry | None:
    """One VM's readings → a ResourceTelemetry the engine understands.

    Returns None if the VM has too few samples to be analyzable.
    """
    series = df_readings.loc[df_readings.vm_id == vm_id].sort_values("timestamp")
    if len(series) < 100:
        return None
    cpu = series["avg_cpu"].to_numpy(dtype=float)
    return ResourceTelemetry(
        resource_id=str(vm_id),
        service="EC2",                      # priced as AWS to make a relatable headline
        resource_type="m5.xlarge" if assumed_vcpu == 4 else "m5.2xlarge",
        region="us-east-1",
        cpu=cpu,
        # Azure trace lacks network metrics — let the idle scorer fall back
        # to its conservative cpu-only confidence (caps at 0.5 → never flagged
        # without corroborating evidence). Explicit shape required.
        net_in=np.zeros_like(cpu),
        net_out=np.zeros_like(cpu),
        hourly_cost=aws_rate_per_vcpu_hr * assumed_vcpu,
    )


def iter_telemetry(
    readings_csv: str | Path,
    *,
    max_vms: int | None = None,
    assumed_vcpu: int = 4,
):
    """Stream telemetry objects one VM at a time."""
    df = load_vm_cpu_readings(readings_csv)
    vm_ids = df.vm_id.unique()
    if max_vms is not None:
        vm_ids = vm_ids[:max_vms]
    for vm_id in vm_ids:
        t = to_telemetry(df, vm_id, assumed_vcpu=assumed_vcpu)
        if t is not None:
            yield t
