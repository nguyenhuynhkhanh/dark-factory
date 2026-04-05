# Scenario: Contract tests use exact strings found in agent files, not assumed casing

## Type
edge-case

## Priority
high — incorrect casing in assertions causes false passes or brittle tests

## Preconditions
- `tests/dark-factory-contracts.test.js` exists

## Action
Read the test file and verify that key string patterns used in assertions match EXACTLY what exists in the source agent/skill files. Specifically check:

1. The architect findings section headers: the actual strings in architect-agent.md are "Key Decisions Made" and "Remaining Notes" — verify the tests use these exact strings (not "key decisions made" or "KEY_DECISIONS_MADE")
2. The annotation markers: the actual strings in promote-agent.md are "DF-PROMOTED-START" and "DF-PROMOTED-END" — verify exact match
3. The review status values: the actual strings in architect-agent.md are "APPROVED" and "BLOCKED" — verify exact match
4. The path patterns: verify `dark-factory/specs/features/` and `dark-factory/specs/bugfixes/` match the actual paths used in the skill files

## Expected Outcome
- All assertion strings match the exact casing and formatting found in the source files
- No case-insensitive matching (no `.toLowerCase()` or `/i` regex flags) in contract tests unless the source files themselves use inconsistent casing
- If a test uses a regex, it should be case-sensitive

## Notes
This validates EC-1. Contract tests must use the actual interface strings, not assumed conventions.
