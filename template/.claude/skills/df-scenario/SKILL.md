---
name: df-scenario
description: "Template reference for writing Dark Factory scenarios (public or holdout)."
---

# Dark Factory — Scenario Templates

## Public Scenarios
Create at: `dark-factory/scenarios/public/{feature-name}/scenario-{nn}.md`

Public scenarios are visible to the code-agent. They serve as examples and happy-path test cases. The code-agent SHOULD design for these — they represent the documented contract.

## Holdout Scenarios
Create at: `dark-factory/scenarios/holdout/{feature-name}/holdout-{nn}.md`

Holdout scenarios are hidden from the code-agent. They test whether the implementation is **robust**, not just functional. The code-agent only receives vague behavioral failure descriptions if these fail.

## Scenario Template

```md
# Scenario: {title}

## Type
feature | bugfix | regression | edge-case | concurrency | failure-recovery

## Priority
critical | high | medium — why this scenario matters for production

## Preconditions
- Database state, user role, existing data required
- System state (queues, caches, external service status)

## Action
API call, trigger, or user action to perform.
Include: method, endpoint, request body, headers.

## Expected Outcome
- HTTP status code
- Response body structure
- Database state changes
- Side effects (emails, notifications, events emitted)

## Failure Mode (if applicable)
What should happen if this operation fails partway through?

## Notes
Additional context for the test runner.
```

## Coverage Checklist

Use this when writing scenarios to ensure production-grade coverage. Not every item applies to every feature — use judgment.

### Public scenarios should cover:
- Happy path — the basic use case works end-to-end
- Input validation — required fields, type mismatches, basic format checks
- Authorization basics — unauthenticated, wrong role
- Documented edge cases from the spec

### Holdout scenarios should cover:
- **Boundary values** — zero, one, max, max+1, negative, empty collection
- **Concurrency** — two users doing the same thing simultaneously
- **Idempotency** — same request sent twice (network retry, double-click)
- **Partial failure** — external service down, database timeout mid-operation
- **Data integrity** — does a failure leave data in a consistent state?
- **State transitions** — entity already in the target state, illegal transitions
- **Permission edge cases** — cross-owner access, expired token, role escalation
- **Adversarial input** — special characters, SQL injection attempts, oversized payloads
- **Backward compatibility** — do existing API consumers break?
- **Performance-relevant paths** — large dataset, paginated results, N+1 queries
- For bugfixes: the exact reproduction case + variations
