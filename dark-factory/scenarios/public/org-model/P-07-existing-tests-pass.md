# Scenario: All existing tests pass after Phase 1 modifications

## Type
regression

## Priority
critical — zero-regression guarantee is a hard requirement (FR-8, AC-8)

## Preconditions
- Phase 1 implementation is complete
- All 3 agent files have been modified
- Template files have been created

## Action
Run the existing test suites:
```
node --test tests/dark-factory-setup.test.js
node --test tests/dark-factory-contracts.test.js
```

## Expected Outcome
- All tests pass with 0 failures
- No test output contains "FAIL" or error messages
- The tests that check agent content (e.g., frontmatter, information barriers, pipeline routing) all still pass because the non-template content was preserved

## Notes
Corresponds to AC-8, FR-8. This is the most important regression gate.
