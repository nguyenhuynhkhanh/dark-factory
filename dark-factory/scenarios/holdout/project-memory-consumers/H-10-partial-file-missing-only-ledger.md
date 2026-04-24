# Scenario: Partial memory missing — shard missing vs. only ledger missing — consumers degrade correctly

## Type
edge-case

## Priority
high — targeted-warning differentiation; shard-missing and ledger-missing are distinct degradation tiers

## Preconditions — Case A (ledger missing, all shards present)
- `dark-factory/memory/index.md` exists, populated
- `dark-factory/memory/invariants-security.md` exists, populated
- `dark-factory/memory/invariants-architecture.md` exists, populated
- `dark-factory/memory/invariants-api.md` exists, populated
- `dark-factory/memory/decisions-security.md`, `decisions-architecture.md`, `decisions-api.md` all exist
- `dark-factory/memory/ledger.md` does NOT exist
- A feature pipeline runs

## Preconditions — Case B (one shard missing, ledger present)
- `dark-factory/memory/index.md` exists, populated
- `dark-factory/memory/invariants-security.md` does NOT exist (removed manually, or never created by foundation)
- `dark-factory/memory/decisions-security.md` does NOT exist
- `dark-factory/memory/invariants-architecture.md` exists, populated
- `dark-factory/memory/invariants-api.md` exists, populated
- `dark-factory/memory/ledger.md` exists
- A feature pipeline runs where the spec scope touches the security domain

## Action
For each case, spawn spec-agent, architect-agent (all three domains), code-agent, and debug-agent.

## Expected Outcome — Case A (ledger missing)
- Every consumer logs: `"Memory file missing: dark-factory/memory/ledger.md — treating ledger as empty"`.
- Every consumer still reads the index and all relevant shards normally.
- Architect-agent per-domain probes run against the shard content (normal probe) — NOT skipped.
- Architect-agent does NOT emit `Memory probe skipped — registry missing.` (that is only for the fully-missing case).
- Reviews can still BLOCK on invariant/decision violations found in the shards.
- No consumer crashes or refuses to run.
- debug-agent cross-reference against invariant shards still works (ledger is not used for cross-reference).

## Expected Outcome — Case B (security shard missing)
- Every consumer that attempts to load the security shard logs: `"Shard invariants-security.md not found — treating as empty domain"` and `"Shard decisions-security.md not found — treating as empty domain"`.
- Every consumer still reads the index, loads architecture and api shards normally.
- The security-domain architect reviewer: loads the index, attempts to load `invariants-security.md` + `decisions-security.md`, logs the shard-missing warnings, treats the security domain as empty. The security reviewer CANNOT emit security-domain BLOCKERs (no data). It MUST NOT attempt to load architecture or api shards as a substitute.
- Architecture and API architect reviewers run their probes normally from their own shards.
- No consumer crashes or refuses to run.
- The fact that the security shard is missing does NOT trigger `Memory probe skipped — registry missing.` — that is only for the fully-missing case.

## Notes
Validates FR-18, FR-20, EC-2. This scenario covers two distinct degradation cases that must produce different warnings and different behavior. The key distinction: ledger-missing is a minor gap (ledger is supplemental context); shard-missing means that domain's constraint and violation data is unavailable, which constrains what the affected reviewer can assert.
