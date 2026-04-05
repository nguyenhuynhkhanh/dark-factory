# Scenario: Manifest status field is validated against exact enum values

## Type
edge-case

## Priority
medium — incorrect status values cause orchestration routing errors

## Preconditions
- `tests/dark-factory-contracts.test.js` exists with manifest schema tests

## Action
Read the manifest schema tests and verify the status validation:
1. The test defines the allowed status values as exactly: `"active"`, `"passed"`, `"promoted"`
2. The test verifies that a valid status is accepted
3. Optionally: the test could verify that these exact strings appear in df-orchestrate's status transition logic

## Expected Outcome
- The allowed status set is `["active", "passed", "promoted"]`
- The test uses `includes()` or a Set check against this exact list
- The status values match what df-orchestrate uses for status transitions (it references "passed", "promoted" in its lifecycle steps)
- The status values match what df-cleanup uses for identifying stuck features (it references "passed" and "promoted" stuck states)

## Notes
These status values form the state machine contract between df-intake (creates "active"), df-orchestrate (transitions to "passed" and "promoted"), and df-cleanup (handles "passed" and "promoted" stuck states).
