# Scenario: H-25 — Developer accepts all invariants but rejects all decisions

## Type
edge-case

## Priority
medium — EC-17. Per-batch independence must be preserved; empty shard files must still be created.

## Preconditions
- Phase 7 Memory Sign-Off is documented.

## Action
Structural test asserts the sign-off documentation:
1. Each of the three batches is processed independently — accept-all in one batch has no bearing on the other two.
2. If invariants batch results in N accepted entries and decisions batch results in 0 accepted entries:
   - The three invariant shard files (`invariants-security.md`, `invariants-architecture.md`, `invariants-api.md`) are written — shards with matching-domain accepted entries contain those entries; shards with no matching entries are written as empty with a header comment + frontmatter (NOT skipped, NOT absent).
   - All three decision shard files (`decisions-security.md`, `decisions-architecture.md`, `decisions-api.md`) are written as empty with header comment + frontmatter — they MUST exist so consumers can detect "no decisions yet" vs "file missing".
3. The ledger batch result is similarly independent.
4. The index is regenerated after all shard writes, containing only invariant rows (zero decision rows in this scenario).

## Expected Outcome
- Independence of the three batches documented.
- Written-even-if-empty rule documented for all six shard files (not just the ones with accepted entries).
- Consumers can always rely on all six shard files existing post-onboard (unless foundation is absent — BR-10 / EC-1).
- Index regeneration after the asymmetric acceptance is documented (or implied by the general index-last rule).

## Failure Mode (if applicable)
If the documentation would skip writing an empty shard file, test fails — consumers depend on file existence as a bootstrap signal. If only the non-empty shards are written and empty-decision shards are omitted, test names the missing files.

## Notes
This is critical for consumer agents: they should not have to distinguish "shard absent" from "shard empty" in the common case. The foundation sub-spec defines the shard schema; empty shards with headers are valid per schema. The six-shard layout means "written-even-if-empty" applies to all six shard files individually, not just to "invariants" and "decisions" as monolithic categories.
