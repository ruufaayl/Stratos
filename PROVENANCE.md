# PROVENANCE.md

> Auto-maintained log of every idea borrowed from open-source. Auto-appended
> by the Harvest Protocol (HARVEST.md §STEP 4). Do not edit entries by hand —
> add via the protocol so NOTICE stays in sync.
>
> Format: one entry per harvested idea. `Pattern A` = vendored permissive lib,
> `Pattern B` = external wrapper (process-isolated), `Pattern C` = idea
> extracted and reimplemented in our codebase from our types.

---

## Entries

<!-- HARVEST-LOG-START — auto-appended below this line. Do not delete marker. -->

### License-gate decisions (2026-05-23)

The following repos passed the license filter and are cloned into `../_harvest/`
for pattern-study and extraction. No code has been copied or extracted yet —
this is a pre-clearance record so step 1 (license gate) of the Harvest Protocol
is done once per repo.

- **hystax/optscale** — Apache-2.0 ✅ — cleared for Pattern C (extract ideas).
- **cloud-custodian/cloud-custodian** — Apache-2.0 ✅ — cleared for Pattern B (wrap).
- **opencost/opencost** — Apache-2.0 ✅ — cleared for Pattern B (wrap, Phase 2+).
- **infracost/infracost** — Apache-2.0 ✅ — cleared for Pattern B (wrap CLI).
- **Azure/AzurePublicDataset** — CC-BY 4.0 ✅ — PRIMARY proof dataset (V1 trace, 117GB). Attribution required when loader is wired. Cloned with sparse-checkout (excludes `vm-noise-data/` — invalid Windows paths, not needed).
- **google/cluster-data** — CC-BY 4.0 — attribution required when used.

### License-gate refusals (2026-05-23)

Records of repos we DECLINED to vendor, so the decision is preserved:

- **turbot/steampipe** — AGPL-3.0 🔴 — **NOT vendored.** Reason: AGPL linking
  would force Stratos source open. Decision: use `boto3` directly for inventory;
  if Steampipe is ever needed, shell out to the prebuilt CLI only.
- **tailwarden/komiser** — Elastic License 2.0 (ELv2) 🔴 — **NOT vendored.**
  Reason: ELv2 forbids "providing the software to third parties as a hosted or
  managed service" — Stratos is exactly that. Skip entirely.

### proof/loaders/azure_v2.py  ←  Azure/AzurePublicDataset V2 (CC-BY 4.0)
- **Pattern:** dataset attribution (not code)
- **Idea:** Per-VM aggregate stats (max/avg/p95 CPU + vcpu + memory + lifetime
  + workload category) for 2,695,548 real Azure VMs across ~30 days, encrypted
  ids. We map each row to an AWS catalog instance type and synthesize a
  percentile-preserving CPU array so the rightsizer/zombie/idle algorithms
  consume the same shape as time-series telemetry.
- **Original location:** vmtable.csv from Azure Public Dataset V2.
- **Our location:** `proof/loaders/azure_v2.py`
- **Attribution (CC-BY 4.0 requirement):** "Cloud workload telemetry data
  used in this work is sourced from the Microsoft Azure Public Dataset V2,
  licensed under CC-BY 4.0. See https://github.com/Azure/AzurePublicDataset"
- **First real-data proof run:** 100,000 VMs → $2,820,453/mo waste identified
  (avg $26.55/VM/mo over-provisioned compute).

### engine/zombie.py  ←  hystax/optscale (Apache-2.0)
- **Pattern:** C — idea extracted and reimplemented from scratch in our types
- **Idea:** Detect instances that are fully stopped or near-zero CPU but still
  incurring charges (attached EBS volumes, Elastic IPs, reserved-capacity waste)
- **Original location:**
  `bumiworker/bumiworker/modules/recommendations/instances_in_stopped_state_for_a_long_time.py`
  `bumiworker/bumiworker/modules/recommendations/abandoned_instances.py`
- **Our location:** `engine/zombie.py`
- **Decision:**
  - OptScale checks Cloud-API stopped state; we infer from CPU telemetry
    (max CPU == 0 → stopped, max CPU < 0.5% → near-stopped).
  - Confidence tiers (1.0 / 0.85) replace OptScale's "stopped N days" binary.
  - Monthly savings = full resource cost * confidence (EBS continues billing).
  - Risk set to 0.0 for stopped (nothing to interrupt), 0.05 for near-stopped.
  - No code shared — full reimplementation from the algorithm concept.
- **Verified by:** `engine/tests/test_zombie.py` — 11 tests, all passing.

<!-- HARVEST-LOG-END — auto-appended above this line. Do not delete marker. -->

---

## Entry template (for the harvest protocol)

```
### <stratos-file>  ←  <repo-name> (<license>)
- **Pattern:** A | B | C
- **Idea:** one-sentence description of what we took
- **Original location:** path/in/repo/file.py:LINES
- **Our location:** stratos/engine/<file>.py
- **Decision:** what we kept, what we changed, what we discarded
- **Verified by:** unit test name + path
```
