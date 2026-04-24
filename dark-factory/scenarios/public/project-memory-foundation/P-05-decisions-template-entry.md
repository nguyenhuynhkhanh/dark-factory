# Scenario: Shard files do not contain TEMPLATE or placeholder headings

## Type
feature

## Priority
high — TEMPLATE entries in shard files would pollute grep-based probes and require filtering logic in every consumer.

## Preconditions
- All six shard files exist (see P-02).

## Action
For each shard file, read the file content and search for any heading (line starting with `## `) that contains the word `TEMPLATE` or the pattern `TBD-`.

## Expected Outcome
- Zero headings matching `## .*TEMPLATE.*` exist in any shard file.
- Zero headings matching `## .*TBD-.*` exist in any shard file.
- The schema reference (what a real entry looks like) is found in `dark-factory/templates/project-memory-template.md`, NOT embedded as a placeholder in a shard file.

## Notes
Validates FR-6, DEC-TBD-h. This scenario confirms the design decision to eliminate TEMPLATE entries from shard files. Replaces the old P-05 which verified a DEC-TEMPLATE entry existed in decisions.md.
