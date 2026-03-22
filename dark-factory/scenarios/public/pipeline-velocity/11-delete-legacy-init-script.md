# Scenario: Legacy init script is deleted

## Type
feature

## Priority
high -- eliminates dual-source-of-truth

## Preconditions
- `scripts/init-dark-factory.js` exists in the repository
- `bin/cli.js` exists and reads from `template/` directory
- Test suite includes "init-dark-factory.js scaffold" test suite (suite 10)

## Action
Implement the pipeline-velocity feature, which includes deleting the legacy init script.

## Expected Outcome
- `scripts/init-dark-factory.js` is deleted from the repository
- The `scripts/` directory may be empty or removed (depending on whether other scripts exist)
- `bin/cli.js` continues to function -- it reads agent/skill/rule content from `template/` directory, not from the init script
- The test suite no longer includes tests for the init script scaffold
- All tests that previously referenced `init-dark-factory.js` are removed or updated
- The remaining test suites (1-9, 11) continue to pass

## Notes
The project profile notes this dual-source-of-truth problem. This scenario validates it is resolved. The `bin/cli.js` + `template/` approach is the canonical installation path going forward.
