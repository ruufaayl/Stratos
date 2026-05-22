"""Stratos proof harness.

Runs OUR engine against a fleet of resources and prints the dollar headline.

Two modes:
  --synthetic   Use engine.fixtures.synthetic_fleet (10 VMs, deterministic).
                Always works — no data download needed. The CI gate.
  --azure PATH  Use a real Azure Public Dataset V1 vm_cpu_readings CSV.
                Tells the truth on real data.

Run:
    python -m proof.run_proof --synthetic
    python -m proof.run_proof --azure data/azure/vm_cpu_readings-file-1-of-195.csv
"""

from __future__ import annotations

import argparse
import io
import sys
import time
from pathlib import Path

# Force UTF-8 stdout — Windows defaults to cp1252 which chokes on arrows etc.
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from engine import fixtures
from engine.anomaly import detect_cost_anomalies
from engine.idle import idle_score
from engine.rightsizing import recommend_rightsizing


def analyze_fleet(fleet):
    """Walk a list of ResourceTelemetry and surface every opportunity."""
    opportunities = []
    idle_ids = set()
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
    opportunities.sort(key=lambda o: o.get("monthly_savings", 0.0), reverse=True)
    return opportunities


def headline(name: str, n_resources: int, opportunities, elapsed_s: float) -> None:
    total = sum(o.get("monthly_savings", 0.0) for o in opportunities)
    print()
    print(f"  Source: {name}")
    print(f"  Resources analyzed: {n_resources:,}")
    print(f"  Opportunities found: {len(opportunities):,}")
    print(f"  Analysis time: {elapsed_s:.2f}s")
    print()
    print(f"  >>> MONTHLY WASTE IDENTIFIED: ${total:,.2f} <<<")
    print()
    for opp in opportunities[:10]:
        kind = opp["kind"].upper().ljust(10)
        rid = opp.get("resource_id", "?")[:24].ljust(24)
        amt = opp.get("monthly_savings", 0.0)
        detail = ""
        if opp["kind"] == "rightsize":
            detail = f"  {opp['from_type']} -> {opp['to_type']}  (p95 {opp['p95_cpu_pct']:.0f}%)"
        elif opp["kind"] == "idle":
            detail = f"  peak CPU {opp['peak_cpu_pct']:.1f}%  score {opp['idle_score']:.2f}"
        elif opp["kind"] == "anomaly":
            detail = f"  day {opp['day_index']}  {opp['sigma']:+.1f} sigma"
        print(f"    {kind} {rid} ${amt:>12,.2f}/mo  {detail}")


def run_synthetic() -> int:
    print("Stratos proof harness — synthetic fleet (deterministic).")
    fleet = fixtures.synthetic_fleet()
    t0 = time.perf_counter()
    opps = analyze_fleet(fleet)
    elapsed = time.perf_counter() - t0
    headline("engine.fixtures.synthetic_fleet (10 VMs)", len(fleet), opps, elapsed)

    # Also exercise the anomaly detector on synthetic daily spend.
    series, planted = fixtures.daily_cost_with_spikes(spike_days=(30, 60), spike_factor=4.0)
    anoms = detect_cost_anomalies(series)
    print(f"  Anomaly detector found {len(anoms)} cost spikes "
          f"(planted at days {sorted(planted)})")
    return 0


def run_azure(path: str, max_vms: int | None) -> int:
    from proof.loaders.azure import iter_telemetry

    csv_path = Path(path)
    if not csv_path.exists():
        print(f"ERROR: file not found: {csv_path}", file=sys.stderr)
        print("Download a vm_cpu_readings file from the Azure SAS URLs in", file=sys.stderr)
        print("_harvest/AzurePublicDataset/AzurePublicDatasetV1Links.txt", file=sys.stderr)
        return 2

    print(f"Stratos proof harness — Azure Public Dataset V1 ({csv_path.name}).")
    print("(Real Azure utilization, priced at AWS us-east-1 on-demand rates.)")
    t0 = time.perf_counter()
    fleet = list(iter_telemetry(csv_path, max_vms=max_vms))
    print(f"  Loaded {len(fleet):,} VMs in {time.perf_counter() - t0:.1f}s")

    t1 = time.perf_counter()
    opps = analyze_fleet(fleet)
    elapsed = time.perf_counter() - t1
    headline(f"Azure Public Dataset V1 — {csv_path.name}", len(fleet), opps, elapsed)
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--synthetic", action="store_true",
                     help="run on the bundled synthetic fleet (no download required)")
    src.add_argument("--azure", metavar="CSV",
                     help="run on an Azure V1 vm_cpu_readings CSV file")
    p.add_argument("--max-vms", type=int, default=None,
                   help="limit number of VMs analyzed (Azure mode)")
    args = p.parse_args(argv)

    if args.synthetic:
        return run_synthetic()
    return run_azure(args.azure, args.max_vms)


if __name__ == "__main__":
    sys.exit(main())
