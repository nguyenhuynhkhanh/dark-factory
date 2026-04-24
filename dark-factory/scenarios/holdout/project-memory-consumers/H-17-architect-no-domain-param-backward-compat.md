# Scenario: Architect spawned without domain parameter runs unified probe (backward-compat with single-reviewer mode)

## Type
edge-case

## Priority
medium — preserves legacy single-reviewer spawn path

## Preconditions
- `dark-factory/memory/index.md` exists
- `dark-factory/memory/invariants-security.md`, `invariants-architecture.md`, `invariants-api.md` all exist with active entries
- `dark-factory/memory/decisions-security.md`, `decisions-architecture.md`, `decisions-api.md` all exist
- Architect-agent is spawned WITHOUT a `domain` parameter (e.g., by a legacy caller or a manual invocation)
- A spec is under review

## Action
The architect reads `dark-factory/memory/index.md`, then — because no domain parameter is set — loads ALL six shard files (all three invariant shards and all three decision shards). It runs a unified review covering all three domains in a single pass.

## Expected Outcome
- Architect loads: index + `invariants-security.md` + `decisions-security.md` + `invariants-architecture.md` + `decisions-architecture.md` + `invariants-api.md` + `decisions-api.md`.
- Architect produces `dark-factory/specs/features/{name}.review.md` (the unified file, not the three domain-split files).
- Inside the unified review, the Memory Findings section is grouped per-domain:
  ```
  ## Memory Findings

  ### Security
  - Preserved: INV-0002
  - Potentially violated (BLOCKER): INV-0005 — ...

  ### Architecture
  - Preserved: INV-0004
  - Orphaned (SUGGESTION only): INV-0021

  ### API
  - Preserved: INV-0006
  - New candidates declared: DEC-TBD-a (reviewed: fields complete)
  ```
- BLOCKER rules still apply (same thresholds).
- Review Status uses the same state machine (APPROVED / APPROVED WITH NOTES / BLOCKED).
- The architect-agent prompt describes this fallback: when spawned without a domain parameter, load all shards and group findings per-domain in a single review file.

## Notes
Validates EC-13. The parallel and unified modes produce equivalent coverage; only the file layout and shard-loading scope differ. In unified mode, the single reviewer loads all six shards — this is the maximum memory load for an architect invocation (index + 6 shards ≤ 52,000 tokens, within NFR-4 budget for the unified case).
