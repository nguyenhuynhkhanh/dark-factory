# Scenario: Modifies preserves ALL prior history entries (append, not overwrite) in shard

## Type
edge-case

## Priority
critical — durable evolution requires history preservation across multiple modifications.

## Preconditions
- `dark-factory/memory/index.md` has a row for INV-0003 with `[shard:invariants-architecture.md]`.
- `invariants-architecture.md` contains the `## INV-0003` entry with a `history:` array of TWO prior modifications (modified by spec-a, then spec-b).
- Current active `rule` is whatever spec-b last wrote.
- spec-c declares `## Invariants > Modifies > INV-0003` with a new `rule`.

## Action
promote-agent processes spec-c. It reads the index to find INV-0003's shard, reads `invariants-architecture.md`, updates the shard entry in place, then updates INV-0003's row in `index.md` in place.

## Expected Outcome
- `history` in the shard entry now contains THREE entries (preserving spec-a's and spec-b's, PLUS a new entry for spec-c).
- Each history entry has `{ previousValue, modifiedBy, modifiedAt }`.
- The order is preserved (oldest first).
- `rule` is set to spec-c's new value in the shard.
- `lastModifiedBy: spec-c` in the shard.
- The INV-0003 row in `index.md` is updated in place (not a new row appended — Modifies updates the existing row).
- The shard file is written first; the index row update follows (shard-first ordering).

## Failure Mode
If promote-agent overwrites the `history` array with a new single-element entry, the prior spec-a and spec-b history is permanently lost. The index row update is NOT attempted if the shard write fails — but if the shard write succeeds and the index row update fails, the result is an INDEX_HASH_MISMATCH (not ORPHANED_SHARD, since the entry already existed in the index). Document: for Modifies, partial failure on index row update should be logged and reported without data loss (shard has the correct updated content).

## Notes
Adversarial — naive impl might overwrite `history` with a new single-element array. Test asserts N+1 history length after N modifications. The scenario now validates the shard-first write ordering and the in-place index row update (distinct from Introduces, which appends a new row).
