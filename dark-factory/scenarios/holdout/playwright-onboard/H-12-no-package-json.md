# Scenario: No package.json exists in the project

## Type
edge-case

## Priority
high -- non-Node.js projects (Python, Go, etc.) will not have package.json

## Preconditions
- Target project is a Python project with `requirements.txt` and `.py` files
- No `package.json` exists anywhere in the project root

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- All four fields set to `unknown`
- A note is added to Structural Notes explaining that UI/E2E detection could not run without package.json
- The onboard process does NOT error or fail

## Notes
Validates EH-1. Non-Node.js projects should degrade gracefully.
