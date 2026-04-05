# Scenario: Barrier contract tests verify both orchestrator instructions and agent constraints

## Type
edge-case

## Priority
critical — barrier violations are the highest-risk contract break

## Preconditions
- `tests/dark-factory-contracts.test.js` exists with barrier tests

## Action
Read the barrier contract tests and verify they check BOTH sides:

1. **Code-agent holdout barrier**: Verify df-orchestrate says "NEVER pass holdout" in the context of code-agent, AND code-agent says "NEVER read" holdout scenarios
2. **Test-agent public barrier**: Verify df-orchestrate says "NEVER pass" public to test-agent, AND test-agent's constraints section prohibits reading public scenarios (indirectly — test-agent reads holdout, not public)
3. **Architect scenario barrier**: Verify df-orchestrate says "NEVER pass test/scenario content to the architect-agent", AND architect-agent says "ZERO access to scenarios"

## Expected Outcome
- Each barrier test reads BOTH the orchestrator skill file AND the relevant agent file
- Each barrier test asserts the exclusion/prohibition on BOTH sides
- If either side is missing the barrier declaration, the test fails
- At minimum 3 barrier contract tests (one per barrier boundary)

## Notes
This validates BR-5. The existing structural tests in dark-factory-setup.test.js already check that agents declare their own barriers. The contract tests add the complementary check: that the orchestrator's handoff instructions also enforce the barriers.
