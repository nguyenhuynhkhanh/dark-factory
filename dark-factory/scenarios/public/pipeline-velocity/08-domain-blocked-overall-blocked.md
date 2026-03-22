# Scenario: One domain BLOCKED results in overall BLOCKED

## Type
feature

## Priority
critical -- validates strictest-wins aggregation

## Preconditions
- A feature spec with scope size `large` is undergoing parallel domain review
- The Security domain architect-agent returns BLOCKED (e.g., missing input sanitization)
- The Architecture domain architect-agent returns APPROVED
- The API domain architect-agent returns APPROVED WITH NOTES

## Action
All three domain architect-agents complete and the orchestrator synthesizes results.

## Expected Outcome
- The orchestrator reads all three domain review files
- The synthesized `test-feature.review.md` has status: BLOCKED
- The blockers section includes the Security domain's specific blockers
- The notes from the API domain's APPROVED WITH NOTES are preserved in the synthesized review
- The orchestrator reports to the developer that the spec is BLOCKED due to security concerns
- Implementation does NOT proceed
- The orchestrator spawns ONE spec-agent with all findings from all three domains to address the issues
- After the spec-agent updates the spec, a verification round runs

## Notes
The strictest-wins rule means a single BLOCKED from any domain overrides all other approvals. The synthesized review must clearly attribute which domain raised each blocker.
