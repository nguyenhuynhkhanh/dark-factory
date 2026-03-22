# Scenario: Test suite passes after all changes with correct assertion updates

## Type
regression

## Priority
critical -- the test suite is the project's structural integrity check

## Preconditions
- All pipeline-velocity changes have been implemented:
  - df-orchestrate SKILL.md updated with review gating
  - architect-agent.md updated with domain parameterization
  - code-agent.md updated with findings input
  - dark-factory.md rules updated
  - init-dark-factory.js deleted
  - tests updated

## Action
Run `node --test tests/dark-factory-setup.test.js`

## Expected Outcome
- All tests pass (zero failures)
- Suite 1 (Agent definitions): All 7 agents still exist with valid frontmatter. architect-agent.md still has name "architect-agent" in frontmatter.
- Suite 2 (Skill definitions): All 7 skills still exist with valid frontmatter.
- Suite 3 (Directory structure): Unchanged -- all dirs still exist.
- Suite 4 (Pipeline routing): Unchanged -- df-intake is feature-only, df-debug is bug-only, df-orchestrate detects mode.
- Suite 5 (Architect review gate): Updated assertions reflect tiered review model. No longer asserts "minimum 3 rounds" or "at least 3 rounds". Instead asserts review gating, domain parameter, parallel review, and findings forwarding.
- Suite 6 (Information barriers): All 12 barrier tests pass. New assertion that findings forwarding strips round discussion.
- Suite 7-9: Unchanged.
- Suite 10 (Init script scaffold): Entirely removed -- no tests reference `init-dark-factory.js`.
- Suite 11 (CLAUDE.md): Updated if pipeline descriptions changed in dark-factory.md rules.

## Failure Mode (if applicable)
If tests are partially updated (e.g., "minimum 3 rounds" assertion removed but no replacement added), the test suite loses coverage of the architect review behavior.

## Notes
The test count will decrease (init script tests removed) but may increase (new review gating tests added). The net change depends on implementation. The key metric is zero failures, not test count.
