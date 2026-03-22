# Scenario: Domain architect-agents do not receive scenario content

## Type
regression

## Priority
critical -- information barrier must hold for all architect invocations

## Preconditions
- A large-scope feature triggers parallel domain review
- Public scenarios exist in `dark-factory/scenarios/public/test-feature/`
- Holdout scenarios exist in `dark-factory/scenarios/holdout/test-feature/`

## Action
Three domain architect-agents are spawned in parallel.

## Expected Outcome
- None of the three architect-agent spawn messages contain:
  - Public scenario file paths or content
  - Holdout scenario file paths or content
  - References to scenario files or directories
  - Test-related content of any kind
- The architect-agent.md still contains "NEVER read, discuss, or reference scenarios" constraint
- The orchestrator passes only: the spec file path, the feature name, the mode (feature/bugfix), and the domain assignment
- The domain parameter does not accidentally introduce scenario awareness

## Failure Mode (if applicable)
If the orchestrator's new parallel spawn logic accidentally includes scenario paths (copy-paste from the code-agent spawn logic which DOES include public scenarios), the information barrier is broken.

## Notes
This tests that the new parallel spawning code path maintains the same barrier as the old single-agent spawn. The risk is that adding new spawn logic introduces new opportunities for barrier leaks.
