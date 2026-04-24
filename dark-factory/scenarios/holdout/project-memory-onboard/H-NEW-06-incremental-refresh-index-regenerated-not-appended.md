# Scenario: H-NEW-06 — Incremental refresh: index is fully regenerated, not appended to

## Type
edge-case

## Priority
high — FR-19. An append-only index would accumulate stale rows for retired entries and become unsynchronized with shard content over multiple refresh cycles.

## Preconditions
- Phase 3.7 or incremental-refresh section documents index behavior on re-run.

## Action
Structural test asserts the incremental-refresh documentation:
1. Explicitly states that after sign-off completes for the current refresh session, the entire `index.md` is **regenerated from scratch** by scanning all shard files (including those not modified in the current session).
2. The documentation does NOT describe appending new rows to the existing index file, or merging new rows with old rows.
3. The regeneration scans ALL six shard files AND `ledger.md` — not only the shards that received new entries in the current session.
4. Retired entries (status-flipped in the current session) are reflected in the regenerated index with `[status:retired]` (or the documented status tag) — they are not removed from the index, but their status is updated.
5. The regenerated index frontmatter `lastUpdated` and `gitHash` reflect the current regeneration time and HEAD sha — not the previous run's values.

## Expected Outcome
- "Regenerated from scratch" (or equivalent: "full rewrite", "overwrite index", "scan all shards and rewrite") is documented.
- Append behavior is explicitly excluded or the regeneration-from-scratch language makes append impossible.
- Full scan coverage (all shards including unmodified ones) is documented.
- Retired-entry representation in regenerated index is documented.
- Frontmatter freshness (`lastUpdated`, `gitHash`) on regeneration is documented.

## Failure Mode (if applicable)
If the documentation describes appending to the existing index rather than regenerating it, test fails. If only the modified shards are scanned (not all shards), test flags the incomplete scan. If retired entries are described as being removed from the regenerated index, test flags it (they must remain with updated status).

## Notes
The append pattern is the most common implementation shortcut for incrementally updating index-like files. This scenario explicitly guards against it. Regenerating from scratch is slightly more expensive but guarantees the index is always a faithful projection of the current shard state — no ghost rows from prior sessions, no missing rows from the current session, and correct status values for every entry.
