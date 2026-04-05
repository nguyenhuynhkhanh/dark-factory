# Feature: {name}

## Context
Why is this needed? What problem does it solve? What is the business value?

## Scope
### In Scope (this spec)
- Concrete list of what will be built

### Out of Scope (explicitly deferred)
- What is NOT being built and why

### Scaling Path
How this feature grows if the business need grows. Not a commitment — a direction.

## Requirements
### Functional
- FR-1: {requirement} — {rationale}
- FR-2: ...

### Non-Functional
- NFR-1: {requirement} — {rationale}

## Data Model
Schema changes, new collections, field additions.

## Migration & Deployment (MANDATORY for production systems)
**Any change that alters how data is stored, formatted, keyed, or queried MUST have a migration plan.**
This applies to: schema changes, field renames, format changes, cache key changes, config restructuring, API contract changes, behavioral changes to shared queries.

- **Existing data**: What happens to rows/documents/cache entries that already exist in the old format? Specify: migrate in-place, backfill, dual-read, or invalidate.
- **Rollback plan**: If the deployment fails, can we revert without data loss? If not, what's the recovery procedure?
- **Zero-downtime**: Can this be deployed without downtime? If not, what's the maintenance window?
- **Deployment order**: If there are multiple changes (schema + code + config), what order must they deploy in?
- **Stale data/cache**: If cached values or derived data use the old format/keys, how are they invalidated or migrated?

If this feature does NOT touch existing data, stored formats, or cached values, write "N/A — no existing data affected" with a brief justification.

## API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/v1/... | ... | role |

## Business Rules
- BR-1: {rule} — {why this rule exists}
- BR-2: ...

## Error Handling
| Scenario | Response | Side Effects |
|----------|----------|--------------|
| Invalid input | 400 + details | None |
| Unauthorized | 403 | Audit log |

## Acceptance Criteria
- [ ] AC-1: ...
- [ ] AC-2: ...

## Edge Cases
- EC-1: {case} — {expected behavior}

## Dependencies
Other modules/services affected. Breaking changes to existing behavior.
If this is a sub-spec of a decomposed feature:
- **Depends on**: list of sub-spec names that must complete before this one
- **Depended on by**: list of sub-spec names that need this to complete first
- **Group**: parent feature name

## Implementation Size Estimate
- **Scope size**: small (1-2 files) | medium (3-5 files) | large (6-10 files) | x-large (10+ files)
- **Suggested parallel tracks**: how many code-agents and what each implements. ZERO file overlap between tracks.

## Implementation Notes
Patterns to follow from the existing codebase. Specific files/modules to extend.
NOT a design doc — just enough guidance for the code-agent to stay consistent.
