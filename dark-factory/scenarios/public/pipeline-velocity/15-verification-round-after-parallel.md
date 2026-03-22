# Scenario: Verification round runs after spec update from parallel review

## Type
feature

## Priority
high -- validates the follow-up iteration cap

## Preconditions
- A large-scope feature went through parallel domain review
- Two domains returned APPROVED, one returned BLOCKED
- The orchestrator synthesized findings and spawned a spec-agent to address blockers
- The spec-agent updated the spec

## Action
The orchestrator runs a verification round on the updated spec.

## Expected Outcome
- The orchestrator re-spawns the domain architect-agents (or a single round covering all domains) to verify the updated spec
- This is pass 2 of maximum 3
- If the verification round finds new blockers, one more follow-up is allowed (pass 3 of 3)
- If verification is clean (all APPROVED), proceed to implementation
- If pass 3 still has blockers, the orchestrator reports to the developer and stops
- The synthesized review file is updated with the final status

## Notes
The 3-pass cap is: initial parallel review (pass 1) + up to 2 follow-ups (passes 2-3). This prevents infinite review loops while allowing necessary iteration.
