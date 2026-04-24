# Scenario: Two specs in the same wave both introduce invariants → sequential IDs, no collision

## Type
concurrency

## Priority
critical — the single-writer serialization guarantee.

## Preconditions
- Wave 2 contains two specs: spec-a and spec-b, each declaring `INV-TBD-a` (different semantics, same placeholder name). spec-a's entry has `domain: architecture`; spec-b's entry has `domain: security`.
- Both implementation-agents run in parallel in their own worktrees.
- Each spec-a / spec-b's code-agents complete and tests pass concurrently.
- Current state before wave: max INV ID in index = 4.

## Action
Each implementation-agent spawns promote-agent at the end of its lifecycle. promote-agent invocations are serialized (df-orchestrate wave semantics). Whichever promote-agent runs first writes INV-0005 to `invariants-architecture.md` and adds a row for INV-0005 to `index.md`.

## Expected Outcome
- The first promote-agent: reads index (fast path, max = 4), re-reads both index and `invariants-architecture.md` at commit time, writes `## INV-0005` to `invariants-architecture.md`, appends INV-0005 row to `index.md`.
- The second promote-agent: re-reads both `index.md` (now has INV-0005) AND `invariants-security.md` at commit time; sees INV-0005 just written by the first; assigns INV-0006 (max + 1); writes `## INV-0006` to `invariants-security.md`, appends INV-0006 row to `index.md`.
- No ID collision. Each spec's `INV-TBD-a` gets a distinct permanent ID in the correct domain shard.
- Documented in promote-agent.md or the wave-execution narrative of df-orchestrate.md.

## Failure Mode
If the second promote-agent caches the index state from before the first agent wrote, it assigns INV-0005 (collision). The re-read at commit time is the only defense.

## Notes
Covers BR-12, EC-5, INV-TBD-a. The mitigation depends on serialized promote invocations AND re-reading both index and shard at commit time. The original scenario only required re-reading memory (monolithic files); this version specifies the re-read must cover both the index and the target shard. Structural test asserts promote-agent.md documents re-read-both-at-commit-time AND df-orchestrate.md documents wave-serialized promote-agent invocations.
