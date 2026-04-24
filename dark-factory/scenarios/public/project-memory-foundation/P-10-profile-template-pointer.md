# Scenario: project-profile-template.md contains pointer to memory shards, preserves existing Invariants bullet

## Type
feature

## Priority
high — profile readers need to know where canonical invariants live.

## Preconditions
- `dark-factory/templates/project-profile-template.md` exists.

## Action
Read the project profile template and inspect the Business Domain Entities section.

## Expected Outcome
- The Business Domain Entities section contains a pointer note referencing `dark-factory/memory/invariants-*.md` shards (or equivalently the `dark-factory/memory/` directory) as the canonical invariant registry.
- The existing `- **Invariants**: ...` bullet line is still present as a human-readable summary (NOT removed).
- The pointer note does NOT reference `dark-factory/memory/invariants.md` (the old monolithic filename — that file no longer exists).
- The rest of the template (Overview, Tech Stack, Architecture, etc.) is unchanged except for the pointer addition.

## Notes
Validates FR-17. The profile template change is additive — no existing content is removed. The pointer reference uses the shard naming convention (`invariants-*.md`) or the directory path to avoid coupling to any specific shard filename.
