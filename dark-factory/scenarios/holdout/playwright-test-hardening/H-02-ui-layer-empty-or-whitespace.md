# Scenario: UI Layer field value is empty string or whitespace

## Type
edge-case

## Priority
medium -- guards against malformed profile data

## Preconditions
- Project profile exists
- Tech Stack table contains: `| UI Layer |  |` (empty) or `| UI Layer |   |` (whitespace only)

## Action
Test-agent reads project profile and evaluates UI Layer field.

## Expected Outcome
- After trimming, the value is empty string
- Test-agent treats this as "field missing" -- logs "UI Layer field not found in profile -- proceeding with E2E detection"
- Proceeds with normal Playwright detection (does NOT skip E2E)

## Notes
Validates EC-2. Empty/whitespace values should not be treated as "none."
