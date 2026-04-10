# Scenario: P-01 — Happy path: baseline recorded, second run shows delta

## Type
feature

## Priority
critical — this is the core feature value: named baseline written on first run, delta shown on second run

## Preconditions
- `dark-factory/manifest.json` contains an entry for `my-spec` with `"group": null`
- Spec file `dark-factory/specs/features/my-spec.spec.md` exists and has not changed between the two runs
- `~/.df-factory/token-history.jsonl` does NOT contain any existing entry for `my-spec` (clean slate)
- A server is configured (log-event.sh is active and will accept events)
- Run 1: developer runs `df-orchestrate my-spec --tag pre-serena`
- Run 2: developer runs `df-orchestrate my-spec` (no `--tag`)

## Action

**Run 1** — `df-orchestrate my-spec --tag pre-serena`:
1. Implementation-agent computes `SPEC_HASH` at pipeline start (first 7 chars of SHA-256 of the spec file).
2. Pipeline runs to successful completion: architect → code → test → promote phases all execute.
3. Implementation-agent accumulates token counts per phase by parsing `total_tokens: (\d+)` from each sub-agent result.
4. At terminal exit: emits `=== Token Usage ===` display block, then appends one JSON line to `~/.df-factory/token-history.jsonl` with `"tag": "pre-serena"`, and includes token fields in `log_df_outcome` event.

**Run 2** — `df-orchestrate my-spec` (untagged):
1. Implementation-agent computes `SPEC_HASH` at pipeline start (spec file unchanged).
2. Pipeline runs to successful completion with different (lower) token counts.
3. Implementation-agent reads `token-history.jsonl`, finds the tagged `pre-serena` entry for `my-spec`, uses it as the baseline.
4. Emits the display block with the delta line.

## Expected Outcome

**After Run 1:**
- `~/.df-factory/token-history.jsonl` contains exactly one line for `my-spec` with:
  - `"tag": "pre-serena"`
  - `"partial": false`
  - `"specHash"` — a 7-character hex string
  - `"agentTokens"` with non-zero values for at least architect and code phases
  - `"totalTokens"` equal to the sum of all `agentTokens` values
  - `"completedAt"` — a valid ISO 8601 UTC timestamp
- The `log_df_outcome` event payload includes `"totalTokens"`, `"agentTokens"`, `"specHash"`, `"baselineTag": "pre-serena"`, and `"partial": false`.
- The `=== Token Usage ===` display block is the last output before pipeline exit. It contains:
  - Per-phase lines for architect, code, test, promote
  - A `total:` line
  - The line: `No baseline — run with \`--tag <name>\` to record one.` (no delta yet on the first run, even though --tag was passed — the tag records for future runs, it is not the comparison target for this run)
  - The line: `Note: orchestrator's own tokens are not included in this count.`

**After Run 2:**
- `~/.df-factory/token-history.jsonl` contains two lines for `my-spec`: the original tagged `pre-serena` entry and a new untagged entry.
- The `=== Token Usage ===` display block contains:
  - Per-phase lines with the new run's counts
  - A `total:` line
  - A delta line in the form: `vs. pre-serena (YYYY-MM-DD): ±N% (±M tokens)` where the date is the `completedAt` date of the baseline
  - `spec hash: <hash> [unchanged ✓]` — confirming both runs used the same spec
  - `Note: orchestrator's own tokens are not included in this count.`
- The new untagged entry in `token-history.jsonl` has `"tag": null`.

## Failure Mode (if applicable)
If the display block appears before pipeline exit (e.g., before the cleanup step), NFR-3 is violated. The display must be the LAST output.

If `totalTokens` in `token-history.jsonl` does not equal the sum of all `agentTokens` values, the accumulation logic has a bug.

If `--argjson` is not used for numeric fields, the values in the JSON line will be quoted strings rather than numbers, which causes downstream comparison arithmetic to break.

## Notes
The first run records the baseline but has nothing to compare against, so it shows "No baseline" for its own display. The tag marks that run as the reference point for FUTURE runs. This is the correct behavior — the tag is a forward-looking marker, not a self-referential comparison.

The `spec hash: ... [unchanged ✓]` line on Run 2 is the key quality signal: it confirms that token differences reflect pipeline changes, not spec differences.
