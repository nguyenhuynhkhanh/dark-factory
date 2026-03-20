---
name: df-spec
description: "Template reference for manually writing Dark Factory specs."
---

# Dark Factory — Spec Templates

Use these templates when manually writing specs (instead of using `/df-intake`).

## Feature Spec
Create at: `dark-factory/specs/features/{name}.spec.md`

```md
# Feature: {name}

## Context
Why is this needed? What problem does it solve?

## Requirements
### Functional
- FR-1: ...

### Non-Functional
- NFR-1: ...

## Data Model
Schema changes, new collections, field additions.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|

## Business Rules
- BR-1: ...

## Acceptance Criteria
- [ ] AC-1: ...

## Edge Cases
- EC-1: ...

## Dependencies
Other modules/services affected.
```

## Bugfix Spec
Create at: `dark-factory/specs/bugfixes/{name}.spec.md`

```md
# Bugfix: {name}

## Symptoms
What is happening?

## Expected Behavior
What should happen?

## Reproduction Steps
1. ...

## Affected Area
Module, service, endpoint.

## Root Cause Analysis
What investigation revealed.

## Acceptance Criteria
- [ ] AC-1: Bug no longer reproduces
- [ ] AC-2: Regression test added

## Edge Cases
Related scenarios.
```
