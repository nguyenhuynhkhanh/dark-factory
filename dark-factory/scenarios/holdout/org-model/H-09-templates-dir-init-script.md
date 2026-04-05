# Scenario: Init script generates templates directory for target projects

## Type
feature

## Priority
medium — init script sync is required by FR-7 but is a secondary concern for Phase 1

## Preconditions
- Phase 1 implementation is complete
- `scripts/init-dark-factory.js` exists (or was deleted by pipeline-velocity -- check)

## Action
Check whether the init script has been updated to generate:
1. The `dark-factory/templates/` directory
2. All 3 template files within it

## Expected Outcome
- If the init script still exists: it has generator functions for all 3 template files
- If the init script was removed (as suggested by test section 13 "REMOVED"): this scenario is N/A and should be documented as deferred

## Notes
Corresponds to FR-7. The test section 13 comment "Init script scaffold -- REMOVED (script deleted by pipeline-velocity)" suggests this may be N/A.
