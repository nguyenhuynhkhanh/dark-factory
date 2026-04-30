# Scenario: findings.md Written by df-intake Is Still Deleted by implementation-agent Step 5 Cleanup

## Type
feature

## Priority
high — findings.md lifecycle contract must remain consistent: written at intake, consumed during implementation, deleted at cleanup

## Preconditions
- A spec `cleanup-spec` has completed the full pipeline up to promotion
- `dark-factory/specs/features/cleanup-spec.findings.md` was written by df-intake Step 5.6 (NOT by implementation-agent)
- The file is referenced in the manifest as `findingsPath`
- implementation-agent has passed Gate 4 (holdout validation) and is running Step 5 (cleanup)

## Action
implementation-agent Step 5 cleanup runs. It reads the findings file path from `findingsPath` in the manifest. It deletes the findings file.

## Expected Outcome

### findings.md deleted by Step 5
- `dark-factory/specs/features/cleanup-spec.findings.md` no longer exists after Step 5 completes
- The deletion happens via `findingsPath` from the manifest (not from a hardcoded naming convention)

### Step 5 cleanup list includes findings file
- implementation-agent Step 5's deletion list explicitly includes the findings file (referenced as `dark-factory/specs/features/{name}.findings.md`)
- This is unchanged from the existing behavior (the file is still cleaned up in Step 5)

### Other cleanup steps unchanged
- Spec file, review files, scenario directories, results directory all still deleted as before
- Manifest entry removed as before
- Commit messages unchanged

### Source assertion
- `src/agents/implementation-agent.src.md` Step 5 section references `.findings.md` in the cleanup list
- The existing P-08 test (ao-thin-impl-agent) assertion continues to pass: `content.includes(".findings.md") && content.includes("Cleanup")`

## Notes
This scenario maps to D10, the existing P-08 test assertion, and AC-2's ordering requirement.
The findings.md is now WRITTEN by a different agent (df-intake, not implementation-agent), but it is still DELETED by implementation-agent Step 5. This asymmetry (written at intake, deleted at implementation cleanup) is intentional and correct per D10. The code-agent reads it between those two events.
