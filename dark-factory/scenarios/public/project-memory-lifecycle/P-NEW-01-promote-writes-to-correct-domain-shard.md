# Scenario: promote-agent writes to the correct domain shard based on entry's domain field

## Type
feature

## Priority
critical — domain routing is the foundation of the shard-based write protocol.

## Preconditions
- `.claude/agents/promote-agent.md` edited per this spec.
- A spec introduces three invariants with different domains:
  - `INV-TBD-a` with `domain: security`
  - `INV-TBD-b` with `domain: architecture`
  - `INV-TBD-c` with `domain: api`
- Shard files `invariants-security.md`, `invariants-architecture.md`, `invariants-api.md` all exist.

## Action
Read promote-agent.md's shard-routing documentation.

## Expected Outcome
- The agent documents a domain-to-shard routing table:
  - `security` → `invariants-security.md` (or `decisions-security.md` for decisions)
  - `architecture` → `invariants-architecture.md`
  - `api` → `invariants-api.md`
- `INV-TBD-a` is materialized as `## INV-NNNN` in `invariants-security.md` only.
- `INV-TBD-b` is materialized as `## INV-MMMM` in `invariants-architecture.md` only.
- `INV-TBD-c` is materialized as `## INV-PPPP` in `invariants-api.md` only.
- Each new entry gets a corresponding row in `index.md` with the correct `[shard:...]` bracket pointing to the correct shard filename.
- An unrecognized domain value is documented as a promotion error (not silently ignored).

## Notes
Covers FR-3, EC-1. This is the core routing requirement that differentiates the shard layout from the old monolithic layout. The domain field on the spec's TBD placeholder determines where the entry lands — it cannot be changed after materialization without a Supersedes operation.
