# Scenario: All six shard files exist with valid frontmatter

## Type
feature

## Priority
critical — shard files are the write targets for onboard-agent and promote-agent. If any shard is missing, the domain it covers has no storage.

## Preconditions
- `dark-factory/memory/` directory exists (see P-01).

## Action
For each of the six shard files:
- `dark-factory/memory/invariants-security.md`
- `dark-factory/memory/invariants-architecture.md`
- `dark-factory/memory/invariants-api.md`
- `dark-factory/memory/decisions-security.md`
- `dark-factory/memory/decisions-architecture.md`
- `dark-factory/memory/decisions-api.md`

Verify the file exists and parse its YAML frontmatter.

## Expected Outcome
- All six files exist as regular files.
- Each file's frontmatter parses without error.
- Each file's frontmatter contains: `version` (value `1`), `lastUpdated`, `generatedBy`, `gitHash`.

## Notes
Validates FR-6. Six shards replace the two old monolithic files (`invariants.md`, `decisions.md`). Three shards per type, one per domain (`security`, `architecture`, `api`).
