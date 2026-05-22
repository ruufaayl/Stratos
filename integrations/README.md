# integrations/ — Pattern-B wrappers

> External engines we drive from outside (process isolation = license safety).
> We generate their config, invoke them, and read their output.
>
> See [FOUNDATIONS.md §MERGE / OVERHAUL ARCHITECTURE](../FOUNDATIONS.md).

## Targets

- `custodian/` — wrap Cloud Custodian for remediation (Apache-2.0). Phase 2.
  Translate Stratos opportunities → Custodian policy YAML.
- `infracost/` — wrap Infracost CLI for IaC pre-spend (Apache-2.0). Phase 4.
- `opencost/` — wrap OpenCost for Kubernetes (Apache-2.0). Phase 2+.

Each wrapper exposes a small, typed surface. Our engine never imports their
code — we shell out. Process isolation also sidesteps license entanglement.
