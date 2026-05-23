"""Stratos proof harness.

Runs OUR engine against a fleet of resources and prints the dollar headline.

Modes:
  --synthetic            engine.fixtures.synthetic_fleet (10 VMs, deterministic).
                         Always works — no data download. The CI gate.
  --azure PATH           Real Azure Public Dataset V1 vm_cpu_readings CSV.
                         Per-5-min time series, full waveform.
  --azure-vmtable PATH   Real Azure Public Dataset V2 vmtable.csv.
                         Per-VM aggregate stats (max/avg/p95 CPU) for 2.6M VMs.

Run:
    python -m proof.run_proof --synthetic
    python -m proof.run_proof --azure data/azure/vm_cpu_readings-file-1-of-195.csv
    python -m proof.run_proof --azure-vmtable data/azure/vmtable.csv --max-vms 50000
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
from engine.zombie import zombie_score


def analyze_fleet(fleet, *, rightsize_kwargs: dict | None = None):
    """Walk a list of ResourceTelemetry and surface every opportunity.

    Priority: zombie -> idle -> rightsize (same as engine/main.py).

    rightsize_kwargs: extra arguments forwarded to recommend_rightsizing().
    Used by the V2 vmtable loader to pass max_cpu_veto=1.01 (effectively
    disabled), because V2's `max_cpu` is a single-sample peak across a
    ~30-day trace — using it as a veto is too aggressive on real data.
    """
    rs_kwargs = rightsize_kwargs or {}
    opportunities = []
    zombie_ids = set()
    idle_ids = set()

    for t in fleet:
        opp = zombie_score(t)
        if opp is not None:
            opportunities.append(opp)
            zombie_ids.add(t.resource_id)

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
        opp = recommend_rightsizing(t, **rs_kwargs)
        if opp is not None and opp["monthly_savings"] > 0:
            opportunities.append(opp)

    opportunities.sort(key=lambda o: o.get("monthly_savings", 0.0), reverse=True)
    return opportunities


def analyze_stream(
    fleet_iter,
    *,
    rightsize_kwargs: dict | None = None,
    progress_every: int = 100_000,
):
    """Single-pass streaming analyzer for very large fleets.

    Memory stays bounded — we never materialize the fleet list. Each VM is
    classified in one pass (zombie OR idle OR rightsize; first match wins),
    and only the much smaller opportunity dicts are retained.

    For the Azure V2 vmtable (2.6M VMs * 2016-element CPU arrays =
    ~42 GB if materialized), this is the only viable path.

    Returns: (n_analyzed, opportunities) tuple.
    """
    rs_kwargs = rightsize_kwargs or {}
    opportunities = []
    n = 0
    t_start = time.perf_counter()

    for t in fleet_iter:
        n += 1

        # zombie first (highest confidence, zero risk)
        opp = zombie_score(t)
        if opp is not None:
            opportunities.append(opp)
        else:
            # idle next
            opp = idle_score(t)
            if opp["idle_score"] >= 0.7:
                opportunities.append(opp)
            else:
                # rightsize last
                opp = recommend_rightsizing(t, **rs_kwargs)
                if opp is not None and opp["monthly_savings"] > 0:
                    opportunities.append(opp)

        if n % progress_every == 0:
            elapsed = time.perf_counter() - t_start
            rate = n / elapsed if elapsed > 0 else 0
            running_total = sum(o.get("monthly_savings", 0.0) for o in opportunities)
            print(
                f"    ... {n:>10,} VMs scanned  |  "
                f"{len(opportunities):>9,} opps  |  "
                f"${running_total:>14,.0f}/mo running  |  "
                f"{rate:>6,.0f} VMs/s",
                flush=True,
            )

    opportunities.sort(key=lambda o: o.get("monthly_savings", 0.0), reverse=True)
    return n, opportunities


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
        if opp["kind"] == "zombie":
            detail = f"  {opp['zombie_label']}  max CPU {opp['max_cpu_pct']:.1f}%  conf {opp['confidence']:.0%}"
        elif opp["kind"] == "rightsize":
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
    headline(f"engine.fixtures.synthetic_fleet ({len(fleet)} VMs)", len(fleet), opps, elapsed)

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


def run_azure_vmtable(
    path: str, max_vms: int | None, emit_summary: str | None = None
) -> int:
    """V2 mode: per-VM aggregate stats from vmtable.csv (2.6M VMs).

    Uses streaming analysis — never materializes the full fleet into memory.
    The full dataset (2.6M VMs * 2016 CPU samples * 8 bytes) would be ~42 GB
    if materialized; streaming keeps it under 1 GB even at full scale.

    If `emit_summary` is a path, writes a compact JSON summary (headline,
    counts, top-50 opportunities) consumable by the /proof page on the web.
    """
    import json as _json

    from proof.loaders.azure_v2 import iter_vmtable

    csv_path = Path(path)
    if not csv_path.exists():
        print(f"ERROR: file not found: {csv_path}", file=sys.stderr)
        return 2

    print(f"Stratos proof harness — Azure Public Dataset V2 vmtable ({csv_path.name}).")
    print("(Real Azure VM aggregate stats, priced at AWS us-east-1 on-demand rates.")
    print(" Long-lived VMs only — filters out short-lived workloads and Unknown category.)")
    if max_vms:
        print(f"  Capped at {max_vms:,} VMs")
    print(f"  Streaming analysis (memory bounded — won't materialize fleet)...")
    print()

    t0 = time.perf_counter()
    n, opps = analyze_stream(
        iter_vmtable(csv_path, max_vms=max_vms),
        rightsize_kwargs={"max_cpu_veto": 1.01},
    )
    elapsed = time.perf_counter() - t0

    if n == 0:
        print("ERROR: no VMs loaded — check that filters aren't too strict.", file=sys.stderr)
        return 1

    headline(f"Azure Public Dataset V2 — {csv_path.name}", n, opps, elapsed)

    if emit_summary:
        total = sum(o.get("monthly_savings", 0.0) for o in opps)
        # Bucket opportunities by kind for the UI
        by_kind: dict[str, int] = {}
        for o in opps:
            by_kind[o["kind"]] = by_kind.get(o["kind"], 0) + 1

        summary = {
            "source": f"Azure Public Dataset V2 ({csv_path.name})",
            "source_url": "https://github.com/Azure/AzurePublicDataset",
            "license": "CC-BY 4.0",
            "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            "resource_count": n,
            "opportunity_count": len(opps),
            "total_monthly_waste": round(total, 2),
            "annual_waste": round(total * 12, 2),
            "analysis_time_seconds": round(elapsed, 2),
            "throughput_vms_per_sec": round(n / elapsed, 0) if elapsed else 0,
            "avg_savings_per_vm": round(total / n, 2) if n else 0,
            "opportunity_count_by_kind": by_kind,
            "top_opportunities": opps[:50],
        }
        out_path = Path(emit_summary)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", encoding="utf-8") as f:
            _json.dump(summary, f, indent=2, default=str)
        print(f"\n  Summary written -> {out_path}")

    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--synthetic", action="store_true",
                     help="run on the bundled synthetic fleet (no download required)")
    src.add_argument("--azure", metavar="CSV",
                     help="run on an Azure V1 vm_cpu_readings CSV file")
    src.add_argument("--azure-vmtable", metavar="CSV",
                     help="run on an Azure V2 vmtable.csv file (per-VM aggregates)")
    p.add_argument("--max-vms", type=int, default=None,
                   help="limit number of VMs analyzed (Azure modes)")
    p.add_argument("--emit-summary", metavar="JSON_PATH", default=None,
                   help="(V2 mode) write a compact JSON summary for the web /proof page")
    args = p.parse_args(argv)

    if args.synthetic:
        return run_synthetic()
    if args.azure_vmtable:
        return run_azure_vmtable(args.azure_vmtable, args.max_vms, args.emit_summary)
    return run_azure(args.azure, args.max_vms)


if __name__ == "__main__":
    sys.exit(main())
