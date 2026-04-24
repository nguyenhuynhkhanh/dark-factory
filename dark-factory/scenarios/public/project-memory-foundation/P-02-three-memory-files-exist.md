# Scenario: All eight memory files exist

## Type
feature

## Priority
critical — foundation requirement.

## Preconditions
- `dark-factory/memory/` directory exists (see P-01).

## Action
List the contents of `dark-factory/memory/`.

## Expected Outcome
- `dark-factory/memory/index.md` exists.
- `dark-factory/memory/invariants-security.md` exists.
- `dark-factory/memory/invariants-architecture.md` exists.
- `dark-factory/memory/invariants-api.md` exists.
- `dark-factory/memory/decisions-security.md` exists.
- `dark-factory/memory/decisions-architecture.md` exists.
- `dark-factory/memory/decisions-api.md` exists.
- `dark-factory/memory/ledger.md` exists.
- Each is a regular file (not a symlink, not a directory).

## Notes
Validates FR-1. Locks the eight-file layout (DEC-TBD-b). The old two-file layout (`invariants.md`, `decisions.md`) is replaced by `index.md` + 6 domain-sharded files.
