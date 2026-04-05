# Scenario: Plugin mirror tests use assert.strictEqual for byte-identical comparison

## Type
edge-case

## Priority
high — content-matching instead of byte-identical could miss whitespace drift

## Preconditions
- `tests/dark-factory-contracts.test.js` exists with plugin mirror tests

## Action
Read the plugin mirror test section and verify:
1. Each test uses `assert.strictEqual(source, plugin)` or `assert.equal(source, plugin)` (which is `strictEqual` when using `node:assert/strict`)
2. No test uses `includes()`, `match()`, or partial comparison for mirrors
3. The source is read from `.claude/agents/` or `.claude/skills/` and the plugin from `plugins/dark-factory/`

## Expected Outcome
- All 8 mirror tests use full-content comparison (not substring matching)
- The comparison is `assert.strictEqual` or `assert.equal` (from `node:assert/strict`, which is strict by default)
- No test reads only partial content or uses regex matching for mirror comparison
- Error messages identify which specific pair diverged

## Notes
This validates BR-2. The existing mirror tests in section 12 and 19 of dark-factory-setup.test.js use `assert.equal(source, plugin)` — the new tests should follow the same pattern.
