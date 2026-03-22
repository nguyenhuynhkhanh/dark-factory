---
name: df-spec
description: "Template reference for manually writing Dark Factory specs."
---

# Dark Factory — Spec Templates

Use these templates when manually writing specs (instead of using `/df-intake`).

**Tip**: `/df-intake` is strongly recommended for features, `/df-debug` for bugs.

## Feature Spec
Create at: `dark-factory/specs/features/{name}.spec.md`

```md
# Feature: {name}

## Context
Why is this needed? What problem does it solve? What is the business value?

## Scope
### In Scope (this spec)
- Concrete list of what will be built

### Out of Scope (explicitly deferred)
- What is NOT being built and why

### Scaling Path
How this feature grows if the business need grows.

## Requirements
### Functional
- FR-1: {requirement} — {rationale}

### Non-Functional
- NFR-1: {requirement} — {rationale}

## Data Model
Schema changes, new collections, field additions.
Include migration strategy if modifying existing data.

## API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/v1/... | ... | role |

## Business Rules
- BR-1: {rule} — {why this rule exists}

## Error Handling
| Scenario | Response | Side Effects |
|----------|----------|--------------|
| Invalid input | 400 + details | None |

## Acceptance Criteria
- [ ] AC-1: ...

## Edge Cases
- EC-1: {case} — {expected behavior}

## Dependencies
Other modules/services affected. Breaking changes to existing behavior.

## Implementation Notes
Patterns to follow from the existing codebase. NOT a design doc.
```

## Bug Reports
For bugs, use `/df-debug {description}` instead. The debug-agent produces a forensic debug report with root cause analysis and impact assessment.
