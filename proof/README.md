# proof/ — The real-data proof harness

> What goes here: the harness that runs OUR engine against REAL public cloud
> traces and emits real-dollar waste. This is the demo. This is the Show HN.
>
> See [HARVEST.md §THE PROOF HARNESS](../HARVEST.md) for the full spec.

## Targets (Phase 1, week 3)

- `run_proof.py` — orchestrates one fleet analysis end-to-end
- `loaders/azure.py` — Azure Public Dataset (2.6M VMs, 5-min CPU)
- `loaders/google.py` — Google cluster-data (Borg traces, CC-BY)
- `loaders/alibaba.py` — Alibaba cluster trace
- `loaders/bitbrains.py` — GWA-T-12 (multi-metric)
- `stream.py` — SSE walker that emits findings live (Phase 3)

## The headline

```
$ python proof/run_proof.py
  REAL VMs analyzed: 12,041
  Waste opportunities found: 3,887
  >>> MONTHLY WASTE IDENTIFIED: $418,920.00 <<<
```

That number is what the public demo page streams live.

## Data directory

Raw traces are git-ignored. Place them under `data/` (also ignored) and let
each loader find them. Do NOT commit the datasets — they're large, and the
attributions live in [NOTICE](../NOTICE) instead.
