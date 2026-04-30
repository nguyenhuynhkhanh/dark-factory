# Scenario: df-orchestrate State Machine Reduced to 15 States After Removal of Moved States

## Type
feature

## Priority
medium — documentation correctness; test P-11 in factory-redesign-v2 section asserts on the exact state list

## Preconditions
- df-orchestrate SKILL.md has been updated per this feature
- `tests/dark-factory-setup.test.js` factory-redesign-v2 P-11 test has been updated to expect 15 states
- `plugins/dark-factory/skills/df-orchestrate/SKILL.md` is the mirror of the source

## Action
Read `dark-factory/skills/df-orchestrate/SKILL.md` (and its plugin mirror) state machine documentation.

## Expected Outcome

### States removed
- `ARCH_INVESTIGATE` is NO LONGER in the state machine list (this phase now occurs in df-intake)
- `ARCH_SPEC_REVIEW` is NO LONGER in the state machine list (this phase now occurs in df-intake)

### States retained (15 total)
The state machine documentation lists exactly these states:
`INTAKE, INTERVIEW, SPEC_DRAFT, SPEC_REVISION, QA_SCENARIO, QA_SELF_REVIEW, ARCH_SCENARIO_REVIEW, APPROVED, IMPLEMENTING, ARCH_DRIFT_CHECK, TESTING, PROMOTING, DONE, BLOCKED, STALE`

### Documentation note added
- df-orchestrate SKILL.md includes a note explaining that Gate 1 (ARCH_SPEC_REVIEW) now runs in df-intake, and df-orchestrate starts from `QA_SCENARIO` for specs that arrive with `architectReviewedAt` set in the manifest

### Gate table updated
- Gate 1 row is removed from or updated in the Gate Definitions table in df-orchestrate SKILL.md
- Gate 2, Gate 3, Gate 4 remain unchanged

### Plugin mirror parity
- `plugins/dark-factory/skills/df-orchestrate/SKILL.md` reflects the same 15-state list
- Mirror parity test passes

### Test assertion update
- The P-11 test in `tests/dark-factory-setup.test.js` no longer asserts on `ARCH_INVESTIGATE` and `ARCH_SPEC_REVIEW`
- The test now asserts on the 15 remaining states

## Notes
This scenario maps to AC-13, D9.
The 17-state machine test (`factory-redesign-v2 P-11`) must be updated by Track B to reflect the new 15-state list. This is a breaking test change if not updated — the test currently asserts on all 17 states by name.
