# Scenario: Always-review pattern matching uses substring matching, not exact

## Type
edge-case

## Priority
high -- validates that high-risk detection is not brittle

## Preconditions
- A small-scope feature spec lists affected files/modules that use variations of always-review patterns:
  - Case A: File path `src/authentication/guards/jwt.guard.ts` (contains "auth" as substring of "authentication")
  - Case B: Module name "DatabaseMigrationRunner" (contains "migration" as substring)
  - Case C: Description mentions "updating the API contract for /users endpoint" (contains "api contract")
  - Case D: File path `src/utils/security-headers.ts` (contains "security" as substring)

## Action
Run `/df-orchestrate test-feature` for each case.

## Expected Outcome
- All four cases trigger always-review elevation to medium
- The substring matching catches:
  - "auth" inside "authentication"
  - "migration" inside "DatabaseMigrationRunner"
  - "api contract" in natural language description
  - "security" inside "security-headers"
- Case-insensitive matching is used (so "API Contract" matches "api contract")

## Failure Mode (if applicable)
If the pattern matching uses exact word matching or case-sensitive comparison, real-world file names and descriptions that contain these patterns as substrings would not be detected.

## Notes
The spec says "substring matching, not exact match" and the matching should be case-insensitive. The orchestrator reads the spec content and searches for these keywords anywhere in the affected files/modules section.
