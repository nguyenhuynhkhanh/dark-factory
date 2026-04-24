# Scenario: df-cleanup memory health check — MALFORMED_MEMORY reports appropriate rebuild hint

## Type
edge-case

## Priority
medium — developer-facing recovery path.

## Preconditions
- `dark-factory/memory/invariants-security.md` has malformed YAML frontmatter (e.g., unterminated string).
- `dark-factory/memory/index.md` is valid.

## Action
`/df-cleanup` runs.

## Expected Outcome
- Memory Health Check detects the malformation in the shard file.
- Reports: "MALFORMED_MEMORY: dark-factory/memory/invariants-security.md"
- Offers hint: "Run `/df-cleanup --rebuild-index` to regenerate the index from remaining valid shards. For ledger issues, run `/df-cleanup --rebuild-memory`. Invariants/decisions shard files cannot be auto-rebuilt — re-run `/df-onboard`."
- Does NOT auto-fix.
- Does NOT halt cleanup of other issues; reports and continues.
- Also checks `index.md` itself — if index frontmatter is malformed, reports: "MALFORMED_MEMORY: dark-factory/memory/index.md" and suggests `--rebuild-index`.

## Notes
Covers FR-28, BR-13. Adversarial — the malformed shard file must not crash df-cleanup itself. Updated from original H-19 which referenced the old monolithic `invariants.md`. Now covers domain-sharded shard files. Hint now correctly directs to `--rebuild-index` for shard/index issues rather than `--rebuild-memory` (which is ledger-specific).
