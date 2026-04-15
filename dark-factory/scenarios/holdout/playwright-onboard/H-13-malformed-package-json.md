# Scenario: Malformed package.json does not crash onboard

## Type
failure-recovery

## Priority
medium -- defensive coding check

## Preconditions
- Target project has a `package.json` that contains invalid JSON (e.g., trailing comma, missing quote)

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- All four UI/E2E fields set to `unknown`
- A warning is added to Structural Notes: "package.json could not be parsed. UI/E2E detection skipped."
- The rest of the onboard process continues normally (Phase 3+)

## Failure Mode (if applicable)
If the implementation does not handle JSON parse errors, the entire onboard process could fail.

## Notes
Validates EH-3. The onboard-agent must be resilient to bad input.
