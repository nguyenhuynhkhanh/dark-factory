# Scenario: debug-agent loads index, selects domain shards, and cross-references root cause against invariants

## Type
feature

## Priority
medium — advisory; useful for production root-cause reports but not load-bearing on the pipeline

## Preconditions
- `dark-factory/memory/index.md` exists; entry for `INV-0015` shows `[domain:architecture]` and `[shard:invariants-architecture.md]`
- `dark-factory/memory/invariants-architecture.md` contains `INV-0015` (`title: pagination-bounded-at-100-per-request`, domain: architecture)
- A bug is reported: "Dashboard list endpoint returns all 10,000 records and times out"
- The module under investigation (`src/api/routes/dashboard.js`) is in the architecture domain
- debug-agent is spawned via df-debug

## Action
debug-agent performs Phase 2 (Investigate) and Phase 3 (Root Cause Analysis).

## Expected Outcome
- debug-agent reads `dark-factory/memory/index.md` first in Phase 2 alongside profile/code-map (FR-13).
- From the index, debug-agent identifies that the module under investigation (`src/api/routes/dashboard.js`) maps to the `architecture` domain.
- debug-agent loads `dark-factory/memory/invariants-architecture.md` (only the architecture shard — NOT all shards, since the domain is identifiable from the index).
- debug-agent does NOT load `invariants-security.md` or `invariants-api.md` for this investigation (domain is known).
- In Phase 3 Root Cause Analysis, debug-agent identifies the root cause (missing pagination limit).
- The debug report includes a one-line note in the Root Cause section:
  ```
  This bug is an invariant violation: INV-0015 (pagination-bounded-at-100-per-request) — the endpoint returns unbounded results, violating the bound.
  ```
- The debug report template structure is otherwise unchanged. No new section is added; the note is embedded inline in the existing Root Cause content.
- The `.claude/agents/debug-agent.md` prompt references `dark-factory/memory/index.md` as the first memory read in Phase 2, and describes domain-targeted shard selection.
- The old monolithic paths `dark-factory/memory/invariants.md` and `dark-factory/memory/decisions.md` do NOT appear in the Phase 2 load instructions.
- The plugin mirror of debug-agent.md contains byte-identical load + cross-reference language.

## Notes
Validates FR-13, FR-14, EC-11, AC-8, AC-9. If no matching invariant is found, the debug report proceeds normally with no invariant note. The cross-reference is advisory; it does not change the fix approach. When root cause domain is unknown, debug-agent falls back to loading all three invariant shards (conservative fallback).
