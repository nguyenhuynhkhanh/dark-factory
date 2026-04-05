# Scenario: Cross-agent contract tests still pass after Phase 1

## Type
regression

## Priority
critical — contract tests validate inter-agent handoffs; breakage here means pipeline failure

## Preconditions
- Phase 1 implementation is complete
- `tests/dark-factory-contracts.test.js` exists

## Action
Run the cross-agent contract test suite:
```
node --test tests/dark-factory-contracts.test.js
```

## Expected Outcome
- All contract tests pass, specifically:
  - spec-agent writes to `dark-factory/specs/features/{name}.spec.md` path
  - debug-agent writes to `dark-factory/specs/bugfixes/{name}` path
  - debug-agent produces "Root Cause" and "Impact Analysis" output
  - Plugin mirror parity tests pass for spec-agent, debug-agent, and onboard-agent (these agents were modified, so mirrors must be updated too)

## Failure Mode
If plugin mirrors are not updated, the parity tests will fail. The fix is to copy modified agents to `plugins/dark-factory/agents/`.

## Notes
Corresponds to FR-8. Contract tests are the strongest regression signal.
