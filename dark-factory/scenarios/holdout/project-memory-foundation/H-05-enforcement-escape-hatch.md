# Scenario: Template documents the enforced_by / enforcement requirement, and template example entry demonstrates it

## Type
edge-case

## Priority
critical — BR-4 is the anti-aspiration guardrail. An invariant with no enforcement proof is a wish, not a rule.

## Preconditions
- `dark-factory/templates/project-memory-template.md` exists.

## Action
Read the template file. Locate the invariants section.

1. Verify the template text explicitly states that exactly one of `enforced_by` or `enforcement` is required (not both optional, not both always required).
2. Locate the complete example invariant entry in the template. Extract its `enforced_by` and `enforcement` fields.

## Expected Outcome
- The template contains explicit prose or a schema note stating: "either `enforced_by` OR `enforcement` is required — at least one must be present."
- The example invariant entry satisfies this constraint: at least one of `enforced_by` or `enforcement` is populated with a meaningful value.
- If `enforced_by` is present in the example, it contains a test file path (e.g., starts with `tests/`, ends with `.test.js` or similar).
- If `enforcement` is present in the example, its value is exactly one of `runtime` or `manual` (strict enum).
- The example entry does NOT leave both fields empty / missing / set to a literal `TODO`.

## Notes
Validates FR-12, BR-4. The validation target is now the template's example entry (not a TEMPLATE entry in a shard file, which no longer exists). Also validates that the template documents this constraint (see H-04 for the broader template-completeness check).
