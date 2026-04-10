# Scenario: P-03 — Local fallback: no server configured, token history still written and compared

## Type
feature

## Priority
high — the local fallback is the primary use case for most developers who do not have a server configured; the feature is useless without it

## Preconditions
- `~/.df-factory/token-history.jsonl` contains one existing entry for `target-spec` with `"tag": "pre-serena"`, `"totalTokens": 200000`, and a `completedAt` from a previous run
- log-event.sh is configured to exit silently (returns 0 without posting anywhere — simulates no server)
- Developer runs: `df-orchestrate target-spec` (no `--tag`)
- The spec file `dark-factory/specs/features/target-spec.spec.md` has the same content as when the baseline was recorded (same `specHash`)

## Action
1. Implementation-agent computes `SPEC_HASH` at pipeline start. It matches the hash in the baseline entry.
2. Pipeline runs to successful completion.
3. Implementation-agent accumulates token counts per phase (architect: 40,000; code: 80,000; test: 10,000; promote: 3,000 — total: 133,000).
4. At terminal exit:
   a. Calls log-event.sh with the full payload (exits silently — no server).
   b. Reads `~/.df-factory/token-history.jsonl`, finds the `pre-serena` tagged entry for `target-spec`.
   c. Computes delta: 133,000 vs 200,000 = -33.5% (−67,000 tokens).
   d. Emits `=== Token Usage ===` display block with delta line.
   e. Appends new untagged entry to `token-history.jsonl`.

## Expected Outcome
- The `=== Token Usage ===` display block contains:
  - Per-phase lines with the current run's counts
  - `total: 133,000`
  - A delta line: `vs. pre-serena (<date>): -34% (−67,000 tokens)` (percentage rounded to nearest integer)
  - `spec hash: <hash> [unchanged ✓]`
  - `Note: orchestrator's own tokens are not included in this count.`
- `~/.df-factory/token-history.jsonl` now contains TWO entries for `target-spec`: the original tagged `pre-serena` entry (unchanged) and the new untagged entry with `"totalTokens": 133000` and `"tag": null`.
- The original `pre-serena` entry in `token-history.jsonl` is NOT modified or overwritten — the file was appended to, not replaced.
- log-event.sh failure (silent exit) did NOT prevent the local file write or the display from showing the correct delta.

## Failure Mode (if applicable)
If the implementation writes the local file ONLY when a server call succeeds, FR-3 is violated. The local write must happen regardless of server availability.

If the comparison logic requires the server event to complete before reading the local file, the sequence is wrong. The local file is the source of truth for comparison; the server event is fire-and-forget.

## Notes
This scenario validates the independence of the local fallback from the server. The key ordering requirement is: server call (fire-and-forget) → read local file → compute delta → display → append local file. The server call must not gate any of the subsequent steps.

The append operation must not truncate the file. After the run, `wc -l ~/.df-factory/token-history.jsonl` should increase by exactly 1.
