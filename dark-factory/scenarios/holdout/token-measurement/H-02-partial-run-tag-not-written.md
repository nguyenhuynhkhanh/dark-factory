# Scenario: H-02 — Partial run: --tag not written when run fails mid-way

## Type
edge-case

## Priority
critical — a naive implementation that writes the tag on any exit (not just successful completion) poisons the baseline with a partial run's token data, making all future comparisons wrong

## Preconditions
- `~/.df-factory/token-history.jsonl` does NOT contain any entry for `blocked-spec` (clean slate)
- Spec file `dark-factory/specs/features/blocked-spec.spec.md` exists
- The architect review for `blocked-spec` returns BLOCKED (architect finds a critical security issue; implementation-agent calls `log_df_outcome blocked 2`)
- Developer runs: `df-orchestrate blocked-spec --tag stable-baseline`

## Action
1. Implementation-agent computes `SPEC_HASH` at pipeline start.
2. Architect review phase runs. Three domain architect-agents return. One returns BLOCKED. Maximum 3 review rounds are exhausted; the spec-agent cannot resolve the blocker. Overall result: BLOCKED.
3. Implementation-agent sets `partial: true`.
4. Implementation-agent reaches its terminal exit point for the BLOCKED outcome.
5. The `--tag stable-baseline` value is present in the invocation.
6. Implementation-agent must decide: write the tag entry or drop it?

## Expected Outcome
- `~/.df-factory/token-history.jsonl` either:
  - Does NOT contain any new entry for `blocked-spec`, OR
  - Contains one entry with `"partial": true` AND `"tag": null` (tag was dropped)
  - Under NO circumstances should the file contain an entry with `"tag": "stable-baseline"` and `"partial": true`
- The `=== Token Usage ===` display block contains:
  - Token counts for the architect phase only (code, test, promote are 0 because they were never reached)
  - The message: `Token data partial — run blocked at architect.`
  - The message: `Run did not complete — tag not written.`
  - `No baseline — run with \`--tag <name>\` to record one.` (still no baseline established)
- The `log_df_outcome` event payload includes `"partial": true` and does NOT include `"baselineTag"` (the field is absent, not null).
- The `agentTokens` object has `"architect": <nonzero>`, `"code": 0`, `"test": 0`, `"promote": 0`.
- EC-8: even though the test phase was never executed, `"test": 0` is present in `agentTokens` (key exists with value 0, not omitted).

## Failure Mode (if applicable)
If the implementation checks `--tag` at startup and writes the baseline immediately before the pipeline runs (rather than at successful completion), this scenario will fail: the file will contain a partial-run entry with the tag. The check for "write only on success" must be at the terminal success exit point, not at pipeline initialization.

If the implementation silently drops the `--tag` without any user-visible feedback, the developer does not know the baseline was not recorded and may believe they have a valid reference point. The "Run did not complete — tag not written." message is mandatory (BR-3).

## Notes
EC-3 (--tag with special characters): if `--tag "stable-baseline v2"` were used instead (with a space), the tag value in the JSON string must be stored exactly as `"stable baseline v2"` — with the space, not URL-encoded or truncated. A correct jq invocation using `--arg tag "$TAG_VALUE"` handles this. But since this tag is never written (run is blocked), the special-character handling is tested via a success path scenario. This scenario focuses on the partial-run guard.

EC-8 is the secondary signal in this scenario: after a blocked run, ALL four phase keys must be present in `agentTokens`, even if their values are 0. A naive implementation that only writes keys for phases that actually ran will fail this check.
