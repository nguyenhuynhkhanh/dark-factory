# Scenario: H-01 — Spec hash warning: spec changed between baseline and current run

## Type
edge-case

## Priority
high — a naive implementation that skips hash comparison will pass all public scenarios but silently hide the warning that makes comparisons untrustworthy

## Preconditions
- `~/.df-factory/token-history.jsonl` contains one entry for `evolving-spec` with:
  - `"tag": "pre-codemap"`
  - `"totalTokens": 180000`
  - `"specHash": "aabbcc1"` — hash of the ORIGINAL spec content
  - `"completedAt": "2026-04-01T10:00:00Z"`
- The spec file `dark-factory/specs/features/evolving-spec.spec.md` has been modified since the baseline was recorded (e.g., a new acceptance criterion was added during architect review). Its current SHA-256 first 7 chars = `"ff33d56"` (different from `"aabbcc1"`).
- Developer runs: `df-orchestrate evolving-spec` (no `--tag`)

## Action
1. Implementation-agent computes `SPEC_HASH` at pipeline start: `"ff33d56"`.
2. Pipeline runs to successful completion. Current total tokens: 150,000.
3. Implementation-agent reads `token-history.jsonl`, finds the `pre-codemap` baseline with `"specHash": "aabbcc1"`.
4. Detects hash mismatch: `"ff33d56" != "aabbcc1"`.
5. Emits `=== Token Usage ===` display block.
6. Appends new entry to `token-history.jsonl` with `"specHash": "ff33d56"` and `"tag": null`.

## Expected Outcome
- The `=== Token Usage ===` display block MUST contain ALL of the following:
  - Per-phase breakdown and `total: 150,000`
  - The delta line: `vs. pre-codemap (2026-04-01): -17% (−30,000 tokens)` (delta is shown, NOT suppressed)
  - The warning: `⚠ spec changed since baseline — comparison may be invalid.`
  - `spec hash: ff33d56` — WITHOUT the `[unchanged ✓]` marker
- The warning does NOT block or replace the delta — both appear together.
- The new entry in `token-history.jsonl` has `"specHash": "ff33d56"` (the current hash).
- The ORIGINAL entry with `"specHash": "aabbcc1"` is unchanged (append-only).

## Failure Mode (if applicable)
A naive implementation suppresses the delta when hashes differ, showing only the warning without numbers. This violates BR-5 and leaves the developer with no actionable data. The correct behavior is: always show the delta, add the warning alongside it.

A second naive failure: omitting hash comparison entirely, so the `[unchanged ✓]` marker always appears regardless of whether the spec changed. This would cause the warning to never fire, making the entire hash mechanism useless.

## Notes
The distinction between `spec hash: <hash> [unchanged ✓]` and `spec hash: <hash>` (without the checkmark) is subtle but load-bearing. Both runs must store their own hash in `token-history.jsonl`, and the comparison must always check current hash against baseline hash, not assume they match.

EC-4 (duplicate tag) is also exercised here if we imagine the developer ran `--tag pre-codemap` twice: the second entry would have a later `completedAt` and would become the active baseline. The comparison logic must use the MOST RECENT tagged entry, not the first one found.
