# Scenario: Implementation-agent routes flaky tests to spec-agent instead of code-agent

## Type
feature

## Priority
critical -- prevents wasting code-agent rounds on non-code issues

## Preconditions
- Implementation-agent is in Feature Mode, Round 1 Step 3 (Evaluate)
- Test results from `dark-factory/results/{name}/` contain `"flakyE2E": true`
- Results show 2 flaky scenarios (type: `flaky-e2e`) and 0 clean failures

## Action
Implementation-agent reads test results and evaluates them in Step 3.

## Expected Outcome
- Implementation-agent detects `flakyE2E: true` in results metadata
- Implementation-agent does NOT spawn a code-agent (no clean failures to fix)
- Implementation-agent spawns a spec-agent in bugfix mode with:
  - The flaky scenario details (which tests, what behavior)
  - The original feature spec context
  - Instruction to write a bugfix spec targeting the flaky test
- Implementation-agent logs: "Flaky E2E detected for {scenarios}. Spawning spec-agent for bugfix spec rather than re-running code-agent."
- The pipeline does not count this as a failed round toward the 3-round max

## Notes
Validates FR-6 and BR-4. The key distinction: flaky tests exit the normal retry loop entirely. They become a new bugfix pipeline, not a code-agent retry.
