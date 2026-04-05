# Scenario: Manifest schema tests validate against constructed entries, not empty manifest

## Type
edge-case

## Priority
high — testing against an empty manifest proves nothing about field validation

## Preconditions
- `tests/dark-factory-contracts.test.js` exists with manifest schema tests

## Action
Read the manifest schema test section and verify:
1. Tests construct a valid manifest entry object (with `type`, `status`, `specPath`, `created`, `rounds`, `group`, `dependencies`) rather than relying on the live manifest having feature entries
2. Tests validate the top-level manifest structure (`version: 1`, `features` object) using the actual `manifest.json` file
3. Tests validate field-level constraints using the constructed test entry

## Expected Outcome
- At least one test constructs a valid manifest entry and validates its fields
- The `version` field test reads the actual `manifest.json` and asserts `version === 1`
- Field presence tests verify that required fields exist (using `hasOwnProperty` or `in` operator)
- Type validation tests verify: `group` is string or null, `dependencies` is Array, `status` is in allowed set
- Tests work correctly regardless of whether the live manifest has any active features
- This validates EC-3 and BR-3

## Notes
The live manifest in the repository is `{ "version": 1, "features": {} }` with no entries. Schema tests must still validate the field-level contract that df-intake, df-orchestrate, and df-cleanup agree on.
