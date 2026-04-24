# Scenario: promote-agent assigns next-sequential zero-padded IDs using index fast path

## Type
feature

## Priority
critical — ID assignment is the core of the write protocol.

## Preconditions
- `.claude/agents/promote-agent.md` edited per this spec.
- Spec introducing two placeholder invariants (`INV-TBD-a` and `INV-TBD-b`) is being promoted.
- `dark-factory/memory/index.md` currently has rows for INV-0001..INV-0003 (max = 3); index is fresh and not stale.

## Action
Read promote-agent.md's ID-assignment documentation.

## Expected Outcome
- The agent documents the **fast path**: read `index.md`, compute `max(existing) + 1` per type (INV-NNNN, DEC-NNNN, FEAT-NNNN).
- The agent documents the **fallback path**: if the index is stale (ORPHANED_SHARD detected — a shard contains an entry heading not present in the index), scan ALL shard files (`invariants-*.md`, `decisions-*.md`, `ledger.md`) directly to find the true max ID. Scanning is deterministic: IDs appear as headings `## INV-NNNN` in each shard.
- IDs are zero-padded 4-digit strings (INV-0004, INV-0005 — not INV-4, INV-05).
- Multiple placeholders in one spec get sequential IDs (INV-0004 then INV-0005 — both assigned in this run).
- The agent documents that IDs are never reused, even after supersession.

## Notes
Tests assert the phrases "zero-padded", "sequential", "never reused", "shard scan" (or equivalents) appear in promote-agent.md. The fast-path / fallback structure is the new element compared to the original spec.
