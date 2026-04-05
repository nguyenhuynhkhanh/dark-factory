# Scenario: Manifest schema validation tests cover required fields and types

## Type
feature

## Priority
high — malformed manifests cause silent orchestration failures

## Preconditions
- `dark-factory/manifest.json` exists and is valid JSON

## Action
Run the contract test suite and check the manifest schema validation tests.

## Expected Outcome
- 5 tests covering manifest schema:
  1. Feature entry has required fields: `type`, `status`, `specPath`, `created`, `rounds`, `group`, `dependencies`
  2. `group` field is string or null (not undefined, not missing)
  3. `dependencies` field is array (not undefined, not missing)
  4. `status` is one of: `"active"`, `"passed"`, `"promoted"`
  5. `version` field at top level is `1`
- Tests construct a valid test manifest entry and validate against it (not relying on the live manifest having feature entries)
- Tests also validate that invalid values fail the assertions (negative cases)

## Notes
The manifest schema tests validate the contract between df-intake (which writes manifest entries), df-orchestrate (which reads them), and df-cleanup (which removes them). All three must agree on the schema.
