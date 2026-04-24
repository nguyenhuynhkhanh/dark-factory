# Scenario: promote-agent re-reads BOTH index AND relevant shard at commit time (not cached from run start)

## Type
concurrency

## Priority
high — robustness to out-of-band edits and same-wave concurrent promotions.

## Preconditions
- promote-agent.md edited.
- Hypothetical: developer manually adds `## INV-0007` to `invariants-architecture.md` AND adds the corresponding row to `index.md` between implementation-agent's Step 3 (test passed) and Step 4 (promote).
- The initial read at the start of the run saw max INV ID = 6.

## Action
Read promote-agent.md's re-read documentation.

## Expected Outcome
- promote-agent.md explicitly documents: "both `index.md` AND the relevant shard file(s) are re-read at commit time, not cached from start of run" (or equivalent phrasing).
- ID assignment uses the latest on-disk state of both files, not a stale snapshot.
- Adversarial: manual edit adds INV-0007 to the index and shard between start and commit → promote-agent sees INV-0007, assigns INV-0008 (not INV-0007, which would collide).
- The re-read covers both the index (for fast-path ID max) and the relevant shard (for domain validation and entry lookup accuracy).

## Notes
Covers BR-11, EC-8, EC-34. Subtle concurrency scenario — naive impl might read once at Step 1 (index only) and write at Step 7, missing both the interleaved index edit and the interleaved shard edit. The original scenario only required re-reading memory; this version specifies that BOTH the index AND the shard must be re-read.
