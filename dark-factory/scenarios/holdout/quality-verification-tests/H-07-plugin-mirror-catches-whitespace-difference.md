# Scenario: Plugin mirror test would catch a trailing whitespace difference

## Type
edge-case

## Priority
medium — validates that byte-identical means truly identical

## Preconditions
- `tests/dark-factory-contracts.test.js` exists with plugin mirror tests
- All 8 plugin mirrors currently match their sources (tests pass)

## Action
Conceptual validation: verify that the assertion method used (`assert.strictEqual` or `assert.equal` from `node:assert/strict`) would fail if one file had a trailing newline or space that the other did not.

Read the test file and confirm:
1. The comparison reads the ENTIRE file content with `fs.readFileSync(..., "utf8")`
2. No `.trim()` or `.replace()` is applied before comparison
3. The raw file content is compared directly

## Expected Outcome
- Source and plugin content are compared without any normalization
- No trimming, no whitespace stripping, no line-ending normalization
- A single extra character in either file would cause the test to fail
- This validates EC-2: trailing whitespace differences are caught

## Notes
This is a robustness check on the mirror comparison approach. If the tests applied `.trim()` before comparing, they could miss real divergence.
