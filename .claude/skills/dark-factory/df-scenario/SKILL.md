---
name: df-scenario
description: "Template reference for writing Dark Factory scenarios (public or holdout)."
---

# Dark Factory — Scenario Templates

## Public Scenarios
Create at: `dark-factory/scenarios/public/{feature-name}/scenario-{nn}.md`

Public scenarios are visible to the code-agent. They serve as examples and happy-path test cases.

## Holdout Scenarios
Create at: `dark-factory/scenarios/holdout/{feature-name}/holdout-{nn}.md`

Holdout scenarios are hidden from the code-agent. They test edge cases, boundary conditions, and adversarial inputs. The code-agent only receives vague failure descriptions if these fail.

## Scenario Template

```md
# Scenario: {title}

## Type
feature | bugfix | regression | edge-case

## Preconditions
- Database state, user role, existing data required

## Action
API call, trigger, or user action to perform.
Include: method, endpoint, request body, headers.

## Expected Outcome
- HTTP status code
- Response body structure
- Database state changes
- Side effects (emails, notifications, etc.)

## Notes
Additional context for the test runner.
```

## Tips for Good Holdout Scenarios
- Test boundary values (empty, null, max length)
- Test permission edge cases (wrong role, cross-owner access)
- Test concurrent operations
- Test with malformed input
- Test business rule violations
- For bugfixes: test the exact reproduction case + variations
