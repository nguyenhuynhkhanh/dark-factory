# Scenario: debug-agent variant scenario requirements preserved after extraction

## Type
regression

## Priority
high — variant scenario logic is process-critical; it determines how many regression tests to write

## Preconditions
- Phase 1 implementation is complete
- debug-agent.md has been modified

## Action
Read `.claude/agents/debug-agent.md` and search for variant scenario requirements.

## Expected Outcome
- The agent file still contains:
  - "Variant scenario requirements" section or equivalent
  - Maximum 3-5 variant scenarios guidance
  - Proportional to Regression Risk Assessment level: HIGH = 3-5, MEDIUM = 1-2, LOW = 0
  - Zero variants justification requirement for trivially isolated bugs
  - Variants in BOTH public and holdout

## Notes
The variant scenario section is between the main process and the template in the original file. Extraction boundaries must be precise.
