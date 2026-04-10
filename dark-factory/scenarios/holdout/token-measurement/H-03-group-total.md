# Scenario: H-03 — Group total: last spec in a wave writes groupTotalTokens

## Type
edge-case

## Priority
high — a naive implementation that only tracks per-spec tokens misses the group rollup entirely, leaving group-level cost invisible

## Preconditions
- A group named `optimization-wave` contains three specs: `spec-alpha`, `spec-beta`, `spec-gamma`, all listed in `manifest.json` with `"group": "optimization-wave"`
- All three specs are being run as a wave via `df-orchestrate --group optimization-wave`
- `~/.df-factory/token-history.jsonl` does NOT contain any entries for these three specs (clean slate)
- No `--tag` is passed (group run, no baseline tagging needed for this scenario)
- The wave runs in parallel: `spec-alpha` and `spec-beta` complete first; `spec-gamma` completes last

## Action
1. Three implementation-agents run in parallel, one per spec.
2. `spec-alpha` completes with `totalTokens: 90,000`. Implementation-agent appends its entry to `token-history.jsonl`. It checks the group: `spec-beta` and `spec-gamma` have not yet completed. No `groupTotalTokens` written.
3. `spec-beta` completes with `totalTokens: 120,000`. Implementation-agent appends its entry. Checks the group: `spec-alpha` is done, `spec-gamma` is not. No `groupTotalTokens` written.
4. `spec-gamma` completes with `totalTokens: 102,400`. Implementation-agent appends its entry. Checks the group: all three specs are now completed (non-partial entries in `token-history.jsonl` or manifest). It is the last to complete.
5. `spec-gamma`'s implementation-agent sums: 90,000 + 120,000 + 102,400 = 312,400.
6. Writes `groupTotalTokens: 312,400` to both the `log_df_outcome` event payload and the local `token-history.jsonl` entry for `spec-gamma`.

## Expected Outcome
- `~/.df-factory/token-history.jsonl` contains exactly three entries (one per spec):
  - `spec-alpha` entry: `"totalTokens": 90000`, `"group": "optimization-wave"`, NO `groupTotalTokens` field
  - `spec-beta` entry: `"totalTokens": 120000`, `"group": "optimization-wave"`, NO `groupTotalTokens` field
  - `spec-gamma` entry: `"totalTokens": 102400`, `"group": "optimization-wave"`, `"groupTotalTokens": 312400`
- The `log_df_outcome` event payload for `spec-gamma` includes `"groupTotalTokens": 312400`.
- The `log_df_outcome` event payloads for `spec-alpha` and `spec-beta` do NOT include `groupTotalTokens`.
- `spec-gamma`'s `=== Token Usage ===` display block includes a group summary line, such as: `group total (optimization-wave): 312,400 tokens across 3 specs`
- `spec-alpha` and `spec-beta` display blocks do NOT include a group total line (they completed before the group was done).

## Failure Mode (if applicable)
If ALL three specs write `groupTotalTokens` (each computing a partial sum at the time they finish), the group total will be wrong for the first two and correct only for the last. The logic must check: "are ALL other specs in my group completed?" before writing the group total.

If `spec-gamma` counts only its OWN `totalTokens` as the group total (102,400 instead of 312,400), the implementation is reading only the current spec's data instead of summing across all group members. The group total requires reading the other specs' token data from `token-history.jsonl` or the manifest.

EC-6 (partial spec in a group): if `spec-beta` had failed with `"partial": true`, `groupTotalTokens` should be computed from only the completed (non-partial) specs: 90,000 + 102,400 = 192,400. Partial specs contribute 0 to the group total and the group summary should note the incomplete run.

## Notes
The "last to complete" detection is based on wall-clock completion order, inferred from which specs have already written completed (non-partial) entries to `token-history.jsonl` at the time the current spec exits. This is a file-based coordination mechanism — no locking is required for the current user scale (one developer, one machine).

EC-2 (multiple `<usage>` blocks in a single agent result): the group sum scenario implicitly exercises multi-result accumulation because three separate agent results are summed. A code-agent that spawns nested sub-agents would produce multiple `total_tokens` matches in its result string — the accumulation logic must sum ALL matches, not just the first.

BR-7 states `groupTotalTokens` is written by the last spec. This scenario verifies that exactly one spec writes it, not zero and not more than one.
