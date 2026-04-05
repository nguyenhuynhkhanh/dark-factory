# Scenario: Phase 1 changes are deployable as a single atomic commit

## Type
feature

## Priority
medium — BR-4 requires atomic commits per phase for clean rollback

## Preconditions
- Phase 1 implementation is complete

## Action
Verify that all Phase 1 changes can coexist in a single commit:
1. 3 new template files
2. 3 modified agent files (with template removed and reference added)
3. Updated test file with new assertions
4. Updated plugin mirrors

## Expected Outcome
- All changes are consistent with each other:
  - Agent files reference templates that exist
  - Tests reference templates that exist
  - Plugin mirrors match source agents
- No intermediate state where agents reference templates that do not yet exist
- A `git revert` of this commit would cleanly restore the pre-Phase-1 state

## Notes
Corresponds to BR-4. The rollback plan in Migration & Deployment depends on this.
