# Feature: Token Reduction Measurement

## Context

Dark Factory has no way to verify that optimizations — Serena integration, adaptive-lead-count, codemap-pipeline — actually reduce token consumption. Every `df-orchestrate` run costs real tokens, but there is no before/after data to demonstrate whether recent pipeline changes are delivering the savings they are designed to deliver.

Without measurement, optimization is guesswork. With measurement, each pipeline change can be validated against a named baseline, and regressions can be detected before they accumulate.

## Scope

### In Scope (this spec)

- Token extraction from sub-agent `<usage>` blocks inside the implementation-agent
- Accumulation of token counts per phase (architect, code, test, promote)
- `specHash` computation (SHA-256 first 7 chars) at pipeline start
- Local fallback storage: `~/.df-factory/token-history.jsonl` — one line per completed run
- Named baselines via `--tag <name>` on `df-orchestrate`; tagged runs become the comparison baseline
- Display block at end of every `df-orchestrate` run: phase breakdown, total, delta vs. most recent tagged baseline
- Group-level totals when a spec belongs to a manifest `group`
- Additive schema extension to the existing `log_df_outcome` event payload (new fields only, no existing fields changed)
- Test assertions in `tests/dark-factory-setup.test.js` for the new token fields and display block
- Mirror update: `plugins/dark-factory/agents/implementation-agent.md` and `.claude/agents/implementation-agent.md` must be identical after the change
- Mirror update: token accumulation logic inside `scripts/init-dark-factory.js` (template literal)

### Out of Scope (explicitly deferred)

- Capturing the implementation-agent's own token spend (orchestrator tokens are not visible to itself — documented as a known undercount, not a bug)
- A dedicated token dashboard or web UI
- Token alerting or thresholds that block a run
- Aggregated cross-spec analytics or trend graphs
- Applying token measurement to `df-debug` or `df-intake` pipelines (only `df-orchestrate` is in scope)
- Pruning or rotating `token-history.jsonl` (file grows unboundedly; manual deletion is the workaround for now)
- Token measurement for sub-agents spawned inside code-agents (only direct sub-agents of the implementation-agent are captured)

### Scaling Path

If token measurement becomes a first-class business concern, `token-history.jsonl` can be replaced by a structured database query against the existing event log server without changing the display or schema contracts defined here. The local file acts as a bridge until a server is configured.

## Requirements

### Functional

- FR-1: The implementation-agent MUST parse `total_tokens: (\d+)` from every sub-agent `<usage>` block and accumulate counts per phase (architect, code, test, promote). — Enables per-phase breakdown.
- FR-2: A `specHash` MUST be computed at pipeline start as the first 7 characters of the SHA-256 of the spec file content, via Bash. — Enables detection of spec drift between baseline and current run.
- FR-3: On successful completion, token data MUST be appended to `~/.df-factory/token-history.jsonl` as a single JSON line, regardless of whether a server is configured. — Ensures comparison works without a server.
- FR-4: On successful completion, token fields MUST be included in the `log_df_outcome` event payload (additive — no existing fields removed or renamed). — Enables server-side analytics when a server is configured.
- FR-5: At the end of every run, the implementation-agent MUST emit a `=== Token Usage ===` display block showing per-phase counts, total, and (when a baseline exists) a delta line. — Gives the developer immediate feedback after every run.
- FR-6: When `--tag <name>` is passed to `df-orchestrate`, the run's token data MUST be tagged and stored as a named baseline ONLY on successful completion. Failed or partial runs MUST NOT write a tag. — Prevents a broken run from poisoning the baseline.
- FR-7: The comparison baseline for a given `featureName` is the most recently stored entry with a non-null `tag` field. Subsequent untagged runs compare against this baseline. — Enables automatic comparison without requiring `--tag` every time.
- FR-8: When a spec belongs to a group (manifest `group` field is non-null), the last spec to complete in the wave MUST compute `groupTotalTokens` as the sum of `totalTokens` across all completed specs in the group and write it to both the event payload and the local file. — Enables group-level cost visibility.
- FR-9: The `partial` field MUST be set to `true` when the run was blocked or aborted before completion, and `false` on full completion. — Allows filtering out incomplete runs from analytics.
- FR-10: All three mirror locations — `.claude/agents/implementation-agent.md`, `plugins/dark-factory/agents/implementation-agent.md`, and the generator function in `scripts/init-dark-factory.js` — MUST be updated atomically; all three must be consistent after the change. — Prevents the dual-source-of-truth problem documented in the project profile.

### Non-Functional

- NFR-1: The token extraction regex (`total_tokens: (\d+)`) must be applied to every sub-agent result string. Missing or malformed `<usage>` blocks must be silently skipped (zero contribution), not crash the pipeline. — Resilience: a missing usage block is not a fatal error.
- NFR-2: Writing to `~/.df-factory/token-history.jsonl` must use append mode. Concurrent writes from parallel spec runs in the same wave are low-risk (each spec is a separate process), but the append must not truncate existing entries. — Data safety.
- NFR-3: The `=== Token Usage ===` display block must be the last output before the terminal exit point, so it is easy to find in the run log. — Discoverability.
- NFR-4: Numeric JSON fields (`totalTokens`, `agentTokens.*`, `durationMs`, `roundCount`) MUST use `--argjson` in jq, not `--arg`. Using `--arg` coerces numbers to strings, which breaks downstream arithmetic and schema validators. — Correctness. (This is the most common fragile point in the init script.)

## Data Model

### token-history.jsonl (new file)

Location: `~/.df-factory/token-history.jsonl`
Format: one JSON object per line (JSONL), appended on each successful run.

```json
{
  "featureName": "my-spec",
  "group": null,
  "specHash": "abc123f",
  "totalTokens": 162700,
  "agentTokens": {
    "architect": 48600,
    "code": 98200,
    "test": 12100,
    "promote": 3800
  },
  "partial": false,
  "tag": "pre-serena",
  "completedAt": "2026-04-10T09:00:00Z"
}
```

Fields:
- `featureName` — spec name as passed to `df-orchestrate`
- `group` — value of `group` field from `manifest.json` for this spec; `null` if ungrouped
- `specHash` — first 7 chars of SHA-256 of spec file content at pipeline start
- `totalTokens` — sum of all sub-agent token counts for this spec
- `agentTokens` — per-phase breakdown; phases not executed have value `0`
- `partial` — `true` if run was blocked/aborted before completion
- `tag` — `null` for untagged runs; string value of `--tag` argument for tagged runs
- `completedAt` — ISO 8601 UTC timestamp of pipeline exit

### log_df_outcome payload additions (additive)

New fields appended to the existing JSON payload produced by the `log_df_outcome` helper:

```json
{
  "totalTokens": 162700,
  "agentTokens": {
    "architect": 48600,
    "code": 98200,
    "test": 12100,
    "promote": 3800
  },
  "partial": false,
  "specHash": "abc123f",
  "baselineTag": "pre-serena",
  "groupTotalTokens": 312400
}
```

- `baselineTag` — only present when `--tag <name>` is passed; absent (not null) when no tag
- `groupTotalTokens` — only present when the spec belongs to a group; absent when ungrouped
- All other existing fields (`command`, `featureName`, `sessionId`, `outcome`, `startedAt`, `endedAt`, `durationMs`, `roundCount`) are unchanged

## Migration & Deployment

N/A — no existing data affected. The changes are:
1. Additive fields in `log_df_outcome` — the existing server (if any) will ignore unknown fields; no schema migration needed.
2. `~/.df-factory/token-history.jsonl` is a new file in an already-existing directory (`~/.df-factory/`). It is created on first write; no migration of existing content.
3. The implementation-agent markdown files are prompt-engineering content, not stored data. They are read fresh on every invocation.
4. The `scripts/init-dark-factory.js` change generates updated agent content for new target projects; existing target projects are unaffected until they re-run `node scripts/init-dark-factory.js`.

Rollback: revert the three agent markdown files and the init script. The `token-history.jsonl` file can be left in place (its presence is harmless to the reverted code, which will not read it).

## API Endpoints

N/A — this is a prompt-engineering framework change. No HTTP endpoints are added or modified.

## Business Rules

- BR-1: Token accumulation happens inside the implementation-agent only. It is the only agent with full visibility across all sub-agent invocations for one spec's lifecycle (architect → code → test → promote). Skill-level agents (df-orchestrate) do not have this visibility because they spawn implementation-agents as opaque sub-processes. — Architectural constraint, not a simplification.
- BR-2: The orchestrator's own token spend is not capturable. `totalTokens` will undercount by the implementation-agent's own context window spend. This is a known limitation, documented in the display block and spec. It is NOT a bug and should NOT be worked around. — Prevents misleading "fix" attempts.
- BR-3: `--tag` only writes a baseline on successful completion. If the run fails, is blocked, or is aborted, the tag is silently dropped and a note is shown: "Run did not complete — tag not written." — Prevents broken runs from poisoning baselines.
- BR-4: Multiple named baselines per spec are supported. Each is stored as a separate entry in `token-history.jsonl`. The most recent tagged entry is the active baseline for comparison. — Supports "pre-serena", "pre-codemap", etc. as independent reference points.
- BR-5: If the spec hash differs between the current run and the baseline, the comparison is still shown but accompanied by a warning. The developer decides whether the comparison is still valid. The delta is never suppressed due to hash mismatch. — Informative, not blocking.
- BR-6: When no baseline exists (no tagged entry for this `featureName`), the display shows the token breakdown but no delta, with the message: "No baseline — run with `--tag <name>` to record one." — Clear call to action.
- BR-7: The `groupTotalTokens` field is written only by the last spec to complete in the wave. "Last" is determined by wall-clock completion order — the first spec to check the group and find all others completed writes the group total. — Avoids double-writes.

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| Sub-agent result contains no `<usage>` block | Skip silently; contribute 0 tokens to that phase | Warning logged: "No usage block found for [phase] agent — token count may be incomplete" |
| `~/.df-factory/` directory does not exist | Create it before writing `token-history.jsonl` | Directory created; write proceeds |
| `token-history.jsonl` is not writable (permissions) | Log warning: "Could not write token-history.jsonl: [error]"; pipeline continues normally | Token data is not persisted locally; event log (if server configured) is unaffected |
| `--tag` passed but run fails before completion | Drop tag silently; show: "Run did not complete — tag not written." | No baseline entry written; `partial: true` in event payload |
| `specHash` computation fails (spec file not readable) | Set `specHash: "unknown"`; log warning; pipeline continues | Comparison will show "spec hash unavailable" instead of hash value |
| `token-history.jsonl` is corrupt / unparseable lines | Skip corrupt lines; use last valid tagged entry as baseline | Warning shown: "Some entries in token-history.jsonl could not be parsed — skipped" |
| `df-orchestrate` run with no sub-agents (e.g., --skip-tests, architect review only) | All unexecuted phases show 0 tokens; `partial: true` | Display block still emits with zeros for unexecuted phases |

## Display Format

Emitted at the end of every `df-orchestrate` run (the last output before terminal exit):

```
=== Token Usage ===
  architect:  48,600
  code:       98,200
  test:       12,100
  promote:     3,800
  ─────────────────
  total:     162,700

  vs. pre-serena (2026-04-08): -38% (−101,300 tokens)
  spec hash: abc123f [unchanged ✓]
```

Variant messages:
- No baseline: `No baseline — run with \`--tag <name>\` to record one.`
- Spec hash changed: `⚠ spec changed since baseline — comparison may be invalid.`
- Partial run: `Token data partial — run blocked at [phase].`
- Failed tag write: `Run did not complete — tag not written.`
- Known undercount note (always present): `Note: orchestrator's own tokens are not included in this count.`

## Acceptance Criteria

- [ ] AC-1: After a `df-orchestrate` run completes, a `=== Token Usage ===` block is printed with per-phase counts and a total.
- [ ] AC-2: When `--tag pre-serena` is passed and the run succeeds, `token-history.jsonl` contains a new line with `"tag": "pre-serena"` and all token fields populated correctly.
- [ ] AC-3: A subsequent untagged run for the same spec reads `token-history.jsonl`, finds the tagged baseline, and prints a delta line: `vs. pre-serena (...): ±N% (±M tokens)`.
- [ ] AC-4: When no tagged baseline exists, the display shows "No baseline — run with `--tag <name>` to record one." and no delta line.
- [ ] AC-5: When `log-event.sh` exits silently (no server configured), `token-history.jsonl` is still written successfully.
- [ ] AC-6: When the spec file changes between baseline and current run, the display shows the `⚠ spec changed since baseline` warning AND still shows the delta.
- [ ] AC-7: When a run is blocked (e.g., architect review returns BLOCKED), `partial: true` is set in both the event payload and `token-history.jsonl`, and the `--tag` value (if any) is NOT written as a baseline.
- [ ] AC-8: For a group run with 3 sub-specs, the last spec to complete writes `groupTotalTokens` equal to the sum of all three specs' `totalTokens`.
- [ ] AC-9: Numeric fields in the jq payload use `--argjson`, not `--arg` (verifiable by reading the generated jq call in the implementation).
- [ ] AC-10: All three agent file mirrors (`.claude/`, `plugins/dark-factory/`, `scripts/init-dark-factory.js`) are consistent after the change. Existing tests in `tests/dark-factory-setup.test.js` continue to pass and new assertions cover the token fields.
- [ ] AC-11: Token display block note reads "Note: orchestrator's own tokens are not included in this count."

## Edge Cases

- EC-1: A sub-agent returns a `<usage>` block with `total_tokens: 0` — this is valid and should be accumulated as 0, not treated as missing.
- EC-2: Multiple `<usage>` blocks in a single sub-agent result string (e.g., a code-agent that itself spawned sub-agents) — extract only the LAST `total_tokens` match from that result, or sum all matches? Spec decision: sum all `total_tokens` matches from a single agent result string, since the implementation-agent cannot distinguish nested sub-agents.
- EC-3: `--tag` value contains spaces or special characters (e.g., `--tag "pre serena v2"`) — the tag must be stored as-is in the JSON string. Bash quoting in the jq call must handle this correctly.
- EC-4: The same `--tag` value is used twice for the same spec — both entries are stored; the second one becomes the new active baseline (most recent wins). No deduplication or overwrite.
- EC-5: `token-history.jsonl` grows very large (thousands of entries) — the comparison logic reads only entries for the current `featureName` and must not load the entire file into memory if avoidable. In practice, the file will be small for the current user scale; this edge case is noted but performance optimization is deferred.
- EC-6: A wave run completes but one spec was skipped/abandoned mid-run — `groupTotalTokens` is computed only from completed (non-partial) specs. Partial specs contribute 0.
- EC-7: `specHash` is computed before architect review begins. If the architect review triggers a spec rewrite (via spec-agent), the hash computed at pipeline start will not match the final spec. This is expected behavior — the warning is appropriate and desired in this case.
- EC-8: `df-orchestrate` is run with `--skip-tests` — the test phase is not executed. The `test` bucket in `agentTokens` must be `0`, not absent from the object.

## Dependencies

None — zero file overlap with `codemap-pipeline`, `adaptive-lead-count`, or `serena-integration`. All four active specs in the manifest are fully independent of this feature.

- **Depends on**: none
- **Depended on by**: none
- **Group**: null

## Implementation Size Estimate

- **Scope size**: small (3-4 files, single concern)
- **Suggested parallel tracks**: 1 code-agent track — single concern, all changes are in the implementation-agent and its mirrors. The test file update is tightly coupled to verifying the implementation-agent content and should be done in the same track to avoid merge conflicts.

## Implementation Notes

- Token extraction: apply regex `total_tokens: (\d+)` to every sub-agent result string. In JavaScript-style pseudocode: `const matches = result.matchAll(/total_tokens: (\d+)/g); for (const m of matches) phaseTotal += parseInt(m[1]);`
- Phase attribution: architect phase tokens come from architect-agent sub-agent results; code phase from code-agent results; test phase from test-agent results; promote phase from promote-agent results. Attribution is by the agent type spawned, not by time.
- specHash computation (Bash): `SPEC_HASH=$(shasum -a 256 "$SPEC_PATH" | cut -c1-7)`. On Linux use `sha256sum`. Emit a cross-platform version: try `shasum -a 256` first, fall back to `sha256sum`.
- Local file write: append a single JSON line to `~/.df-factory/token-history.jsonl` using `jq -cn ... >> ~/.df-factory/token-history.jsonl`. The `~/.df-factory/` directory already exists (created by the existing `log-event.sh` infrastructure).
- **CRITICAL — numeric fields in jq**: `totalTokens`, `agentTokens.architect`, `agentTokens.code`, `agentTokens.test`, `agentTokens.promote`, `groupTotalTokens`, `durationMs`, and `roundCount` MUST use `--argjson`, not `--arg`. `--arg` coerces all values to JSON strings, which breaks downstream arithmetic. Example: `--argjson totalTokens "$TOTAL_TOKENS"` (not `--arg totalTokens "$TOTAL_TOKENS"`).
- `log_df_outcome` extension: add the new token fields to the existing jq expression in the helper. Do NOT replace the helper — extend it. The helper is defined once in the implementation-agent and called at every terminal exit point; the extension must be applied in one place.
- Mirror discipline: after editing `.claude/agents/implementation-agent.md`, copy the full content to `plugins/dark-factory/agents/implementation-agent.md` (they must be character-for-character identical). Then update the generator function in `scripts/init-dark-factory.js` to match — this is the most fragile step due to escaped backticks in template literals.
- Comparison logic: to find the active baseline, read `token-history.jsonl` line by line, parse each JSON object, filter to lines where `featureName` matches and `tag` is non-null. The last matching line is the active baseline.

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 (token extraction per phase) | P-01, P-02, P-03, H-01 |
| FR-2 (specHash at start) | P-01, H-01 |
| FR-3 (local file write) | P-03, H-02 |
| FR-4 (log_df_outcome additive fields) | P-01, P-03 |
| FR-5 (display block always emitted) | P-01, P-02, P-03 |
| FR-6 (--tag only on success) | P-01, H-02 |
| FR-7 (most recent tagged baseline) | P-01, P-03 |
| FR-8 (groupTotalTokens) | H-03 |
| FR-9 (partial flag) | H-02 |
| FR-10 (mirror atomicity) | P-01 (implementation requirement, tested by test suite assertions) |
| BR-1 (implementation-agent only) | P-01 |
| BR-2 (known undercount documented) | P-01 |
| BR-3 (--tag not written on failure) | H-02 |
| BR-4 (multiple baselines) | P-01, H-01 |
| BR-5 (hash mismatch warning + delta shown) | H-01 |
| BR-6 (no baseline message) | P-02 |
| BR-7 (groupTotalTokens last-writer) | H-03 |
| EC-1 (zero token usage block) | H-02 (partial run may produce zeros) |
| EC-2 (multiple usage blocks in one result) | H-03 (group sum implies multi-result accumulation) |
| EC-3 (--tag with special chars) | H-02 |
| EC-4 (duplicate tag) | H-01 (second tag becomes active baseline) |
| EC-6 (group with partial spec) | H-03 |
| EC-7 (specHash at start, spec rewritten mid-run) | H-01 |
| EC-8 (--skip-tests: test bucket is 0 not absent) | H-02 |
