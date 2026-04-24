# Scenario: H-13 — Partial memory files: mixed bootstrap + refresh mode across shard files

## Type
edge-case

## Priority
medium — EC-3. Developers sometimes delete one shard file by hand; the agent must handle the asymmetry without treating the missing shard as a signal to overwrite all other shards.

## Preconditions
- onboard-agent file documents memory file handling.

## Action
Structural test asserts Phase 3.7 documents mixed-mode behavior:
1. Each shard file is evaluated INDEPENDENTLY for bootstrap-vs-refresh based on whether it is present on disk.
2. Example: if `invariants-security.md` is present but `invariants-api.md` is absent → the security shard is in refresh mode; the api shard is in fresh-bootstrap mode. Both are handled in the same sign-off session as separate batches.
3. Example: if all invariant shards are present but `ledger.md` is absent → invariant shards are in refresh mode; ledger is in fresh-bootstrap mode.
4. The sign-off summary clearly labels which shards are in refresh mode vs bootstrap mode, so the developer knows what to expect.
5. After sign-off, the index is regenerated from scratch scanning ALL shards (both those in refresh mode and those in fresh-bootstrap mode).

## Expected Outcome
- Per-shard independent mode determination documented.
- Mixed-mode summary labeling documented.
- Index regeneration covering all shards (including newly bootstrapped ones) is documented.

## Failure Mode (if applicable)
If the documentation assumes all shards are in the same mode (all-refresh or all-bootstrap), test fails. If the summary labeling is not documented, test names the omission. If the index is described as only scanning refresh-mode shards (missing newly bootstrapped ones), test flags it.

## Notes
This is a rare case but important — developers do hand-edit and hand-delete shard files during experimentation. The six-shard layout makes this scenario more likely than in the monolithic-file layout, since each domain can independently be missing. The agent must handle any combination of present/absent shards without either crashing or silently skipping bootstrap for absent shards.
