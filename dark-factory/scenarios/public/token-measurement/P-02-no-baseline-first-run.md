# Scenario: P-02 — No baseline: first run without --tag shows breakdown but no delta

## Type
feature

## Priority
high — the "no baseline" path is the first experience every user has; the display must be clear and actionable

## Preconditions
- `dark-factory/manifest.json` contains an entry for `fresh-spec` with `"group": null`
- Spec file `dark-factory/specs/features/fresh-spec.spec.md` exists
- `~/.df-factory/token-history.jsonl` does NOT contain any entry for `fresh-spec` (or the file does not exist yet)
- No server configured — log-event.sh exits silently
- Developer runs: `df-orchestrate fresh-spec` (no `--tag`)

## Action
1. Implementation-agent computes `SPEC_HASH` at pipeline start.
2. Pipeline runs to successful completion: architect → code → test → promote phases all execute.
3. Implementation-agent accumulates token counts per phase.
4. At terminal exit: implementation-agent attempts to read `token-history.jsonl` for a baseline entry for `fresh-spec`. No tagged entry is found.
5. Emits `=== Token Usage ===` display block.
6. Appends one JSON line to `~/.df-factory/token-history.jsonl` with `"tag": null`.

## Expected Outcome
- The `=== Token Usage ===` display block is emitted and contains:
  - Per-phase lines (architect, code, test, promote) with numeric counts, comma-formatted
  - A separator line `─────────────────`
  - A `total:` line with the sum
  - Exactly the message: `No baseline — run with \`--tag <name>\` to record one.`
  - No delta line (no `vs. ...` line present anywhere in the block)
  - `Note: orchestrator's own tokens are not included in this count.`
- `~/.df-factory/token-history.jsonl` contains exactly one line for `fresh-spec` with `"tag": null` and `"partial": false`.
- The event payload (attempted via log-event.sh) would have included `totalTokens`, `agentTokens`, `specHash`, `partial: false` — but since no server is configured, this is a no-op. The local file write still succeeds independently.

## Failure Mode (if applicable)
If the display block shows a delta line of `0` or `±0%` when no baseline exists, the implementation is incorrectly treating the absence of a baseline as a baseline of zero. The correct behavior is to omit the delta entirely and show the "No baseline" message.

If `token-history.jsonl` is not created when no server is configured, FR-3 is violated. The local file write must be independent of the server.

## Notes
This scenario directly tests BR-6 (no baseline message) and FR-3 (local fallback independent of server). The signal to look for is the exact phrase "No baseline — run with `--tag <name>` to record one." — not a partial match, not a different message.

A phases-that-were-not-executed (zero tokens) must still appear in the display block with a value of `0`, not be omitted. This confirms EC-8 (all phase keys always present).
