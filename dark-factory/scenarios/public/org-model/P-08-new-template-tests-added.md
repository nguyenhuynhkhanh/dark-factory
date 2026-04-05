# Scenario: New tests verify template file existence and structure

## Type
feature

## Priority
high — tests enforce the structural changes introduced by Phase 1

## Preconditions
- Phase 1 implementation is complete
- Template files exist in `dark-factory/templates/`
- Test file has been updated with new test cases

## Action
Run the test suite and check for new test cases that verify:
1. Template file existence (all 3 files)
2. Token cap assertions for spec-agent, debug-agent, onboard-agent
3. Agent files reference template paths

## Expected Outcome
- New tests exist in `tests/dark-factory-setup.test.js` covering:
  - `dark-factory/templates/spec-template.md` exists and is non-empty
  - `dark-factory/templates/debug-report-template.md` exists and is non-empty
  - `dark-factory/templates/project-profile-template.md` exists and is non-empty
  - spec-agent.md token count is under cap
  - debug-agent.md token count is under cap
  - onboard-agent.md token count is under cap
  - Each agent references its template file path
- All new tests pass

## Notes
Corresponds to AC-9, FR-5, BR-1.
