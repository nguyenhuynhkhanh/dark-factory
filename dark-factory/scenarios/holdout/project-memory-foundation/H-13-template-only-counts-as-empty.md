# Scenario: Shard file with only frontmatter (zero entries) is treated as valid-but-empty

## Type
edge-case

## Priority
high — the freshly-shipped state (zero real entries, just frontmatter) must be indistinguishable from "zero real entries" in downstream parsing semantics. If a shard with only frontmatter causes an error, every new project installation breaks.

## Preconditions
- All six shard files exist, each containing only valid YAML frontmatter and no entry headings.

## Action
For each shard file:
1. Parse the frontmatter — expect success.
2. Count lines that start with `## ` in the body after the closing `---` delimiter.
3. Attempt to "load entries" from the shard using the same logic a consumer agent would use.

## Expected Outcome
- Each shard file's frontmatter parses without error.
- Each shard body has exactly zero `## ` heading lines.
- The "load entries" operation returns an empty list without throwing or warning.
- The state is unambiguously valid: a shard with zero entries is not an error, not a warning — it is the expected initial state.
- The template file `project-memory-template.md` documents this: a shard with only frontmatter and zero entries is valid state.

## Notes
Validates EC-3, BR-6, DEC-TBD-h. This scenario replaces the old H-13 which tested "TEMPLATE-only counts as empty" — that concept is moot because shard files no longer ship with TEMPLATE entries. The new scenario validates the equivalent concept: a frontmatter-only shard is correctly parsed as zero real entries.
