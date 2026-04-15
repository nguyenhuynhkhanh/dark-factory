# Scenario: Developer declines to answer UI ambiguity question

## Type
edge-case

## Priority
medium -- graceful degradation when developer does not cooperate

## Preconditions
- Target project has `.html` files but no frontend framework in dependencies
- Ambiguity question is triggered

## Action
Run `/df-onboard`. When the onboard-agent asks the developer about UI layer presence, the developer declines or does not answer.

## Expected Outcome
- `UI Layer` = `unknown`
- `Frontend Framework` = `none`
- The profile is still written successfully with `unknown` value
- No error or failure in the onboard process

## Notes
Validates EH-4. The onboard process must not block on an unanswered question.
