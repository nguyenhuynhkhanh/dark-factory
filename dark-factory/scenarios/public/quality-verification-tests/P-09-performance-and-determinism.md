# Scenario: All 43 tests run in under 100ms and are deterministic

## Type
feature

## Priority
high — slow or flaky tests discourage running the safety net before refactoring

## Preconditions
- `tests/dark-factory-contracts.test.js` exists with all 43 tests

## Action
Run the full test suite twice in succession:
```
node --test tests/dark-factory-contracts.test.js
node --test tests/dark-factory-contracts.test.js
```

## Expected Outcome
- Both runs report exactly 43 tests
- Both runs report 43 passing, 0 failing
- Each run completes in under 100ms (check the test runner's duration output)
- Results are identical between the two runs (deterministic)
- No network calls, no file writes, no randomness

## Notes
Determinism means the tests can be used as a reliable gate. If any test is flaky, it cannot serve as a refactoring safety net.
