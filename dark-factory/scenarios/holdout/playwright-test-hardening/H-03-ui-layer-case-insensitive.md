# Scenario: UI Layer field value "None" or "NONE" triggers exclusion

## Type
edge-case

## Priority
medium -- case sensitivity could cause missed exclusions

## Preconditions
- Project profile exists
- Tech Stack table contains: `| UI Layer | None |` (capitalized)

## Action
Test-agent reads project profile and evaluates UI Layer field.

## Expected Outcome
- Test-agent performs case-insensitive comparison: "None".toLowerCase() === "none"
- Backend-only exclusion activates
- All E2E logic is skipped
- Same behavior as P-01

## Notes
Validates EC-3. Test with "None", "NONE", "nOnE" -- all should trigger exclusion.
