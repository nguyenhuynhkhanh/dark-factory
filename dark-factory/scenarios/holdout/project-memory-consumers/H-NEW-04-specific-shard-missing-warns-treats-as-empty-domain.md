# Scenario: Specific shard missing — agent warns "treating as empty domain" and continues

## Type
failure-recovery

## Priority
high — shard-level failure must not cascade to other domains or abort the pipeline

## Preconditions
- `dark-factory/memory/index.md` exists with entries for both security and architecture domains
- `dark-factory/memory/invariants-architecture.md` exists with `INV-0020`
- `dark-factory/memory/decisions-architecture.md` exists
- `dark-factory/memory/invariants-security.md` does NOT exist (deleted or never created by foundation)
- `dark-factory/memory/decisions-security.md` does NOT exist
- `dark-factory/memory/ledger.md` exists
- A spec is being processed whose scope touches BOTH security modules (`src/auth/`) and architecture modules (`src/services/`), so both domains are identified from the index

## Action
spec-agent performs Phase 1 memory load:
1. Reads `dark-factory/memory/index.md` — succeeds, identifies security and architecture domains in scope.
2. Attempts to load `invariants-security.md` — file not found.
3. Attempts to load `decisions-security.md` — file not found.
4. Loads `invariants-architecture.md` — succeeds.
5. Loads `decisions-architecture.md` — succeeds.
6. Loads `ledger.md` — succeeds.
7. Proceeds with spec drafting.

## Expected Outcome
- spec-agent logs: `"Shard invariants-security.md not found — treating as empty domain"`.
- spec-agent logs: `"Shard decisions-security.md not found — treating as empty domain"`.
- spec-agent does NOT log `"Memory registry not found"` — that is for the fully-missing case.
- spec-agent does NOT log `"Memory index not found"` — the index was present.
- spec-agent continues spec drafting using the architecture-domain entries from `invariants-architecture.md`.
- The `## Invariants > Preserves` or `References` section lists any relevant architecture-domain entries found.
- The spec omits any security-domain memory references (no data available) but does NOT omit the `## Invariants` section itself.
- The architect-agent security reviewer, when spawned, will also encounter the missing security shards and log the same warnings. It will produce a `### Memory Findings (Security)` block with "none" in all categories (empty domain). It does NOT emit `Memory probe skipped — registry missing.`
- No consumer crashes or blocks.

## Failure Mode
If a consumer treats one missing shard as "registry missing" and emits "Memory probe skipped — registry missing", it silently drops the constraint check for the other domains that ARE populated. The per-shard warning + empty-domain treatment keeps other domains' data active while clearly flagging the gap.

## Notes
Validates FR-18, EC-2. This is the most common partial-failure scenario in practice: foundation creates the shard layout incrementally, or a manual deletion touches one shard. The tiered response (per-shard warning vs. registry-missing) must be explicit and distinct in the agent prompts.
