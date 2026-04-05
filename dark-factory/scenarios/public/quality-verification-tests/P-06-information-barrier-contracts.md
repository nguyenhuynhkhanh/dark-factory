# Scenario: Information barrier boundaries are verified in handoff instructions

## Type
feature

## Priority
critical — barrier violations are the highest-severity contract breaks

## Preconditions
- `.claude/skills/df-orchestrate/SKILL.md` exists
- All agent files exist

## Action
Run the contract test suite and check the information barrier contract tests.

## Expected Outcome
- Tests verify df-orchestrate's code-agent handoff instructions explicitly exclude holdout scenarios
- Tests verify df-orchestrate's test-agent handoff instructions explicitly exclude public scenarios
- Tests verify df-orchestrate's architect-agent handoff instructions explicitly exclude test/scenario content
- Tests verify the barrier is mentioned in BOTH the orchestrator's instructions AND the agent's own constraints section
- At least one test per barrier boundary (code-agent/holdout, test-agent/public, architect/scenarios)

## Notes
These tests verify that the handoff instructions enforce barriers, complementing the existing structural tests in `dark-factory-setup.test.js` that verify agents declare their own barriers. The contract tests specifically check that the ORCHESTRATOR's handoff instructions match the agent's barrier declarations.
