# Scenario: project-memory-template.md documents every field with type and required/optional marking

## Type
edge-case

## Priority
critical — if a field is missing from the template, downstream agents will emit malformed memory once they start writing real entries.

## Preconditions
- `dark-factory/templates/project-memory-template.md` exists.

## Action
Read the template file. For each file-type section (index format, invariants, decisions, ledger), verify:

1. Every field from FR-8 (invariants), FR-9 (decisions), FR-10 (ledger) is documented by NAME.
2. Each documented field has an associated type hint (e.g., "list", "markdown", "ISO date", "enum", "spec name", "filename").
3. Each documented field is marked as required OR optional.
4. For enum fields (`source`, `status`, `domain`, `enforcement`), the allowed values are enumerated.
5. The `tags` field is documented as optional with a max-5 lowercase-keyword constraint.
6. The `shard` field is documented as required for invariant and decision entries, with the note that its value is computed by writers (the shard filename).
7. Exactly one complete valid example entry is given per file type (invariant, decision, ledger, and ideally an index row example).
8. Example entries use realistic content (not lorem ipsum) and populate every required field.
9. The template explicitly states "either `enforced_by` OR `enforcement` is required" for invariants (FR-12).
10. The template explicitly states that IDs are zero-padded 4-digit sequential (`INV-0001`), never reused, and assigned only by promote-agent (FR-13).
11. The index row format is documented: `## {ID} [type:...] [domain:...] [tags:...] [status:...] [shard:...]`.
12. Token budget soft limits are mentioned: index ≤ ~4,000 tokens, per-shard ≤ ~8,000 tokens.

## Expected Outcome
- All twelve checks above pass.
- If any field is missing, or any enum is under-specified, or the example entry omits a required field, the test fails with a clear diagnostic.

## Notes
Validates FR-11, FR-12, FR-13, EC-8. Updated from original H-04 to include `tags`, `shard`, index row format, and token budget documentation requirements.
