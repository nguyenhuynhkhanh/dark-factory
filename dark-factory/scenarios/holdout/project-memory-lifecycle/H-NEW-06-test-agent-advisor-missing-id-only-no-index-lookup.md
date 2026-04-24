# Scenario: test-agent advisor output uses INV-IDs only in `missing` category — no index cross-reference

## Type
edge-case

## Priority
high — prevents transitive leakage of index content (invariant rules, metadata) through advisor output to code-agents.

## Preconditions
- test-agent.md edited per this spec.
- test-agent is spawned in `mode: advisor`.
- The draft spec under review declares `## Invariants > References > INV-0003` but has no scenario that exercises INV-0003's behavior.
- `dark-factory/memory/index.md` contains a row for INV-0003:
  ```
  ## INV-0003 [type:invariant] [domain:architecture] [tags:spec] [status:active] [shard:invariants-architecture.md]
  Every spec must declare the invariants it touches
  ```
- `dark-factory/memory/invariants-architecture.md` contains the full INV-0003 entry including its `rule` field.

## Action
test-agent in advisor mode processes the spec and its scenarios. It identifies that INV-0003 is referenced but uncovered. It produces the `missing` category output.

## Expected Outcome
- The advisor's `missing` category output is: `missing: ["INV-0003"]` (or equivalent structured form with just the ID string).
- The output does NOT include: the text of INV-0003's `rule` field, the full entry metadata from `invariants-architecture.md`, the one-line summary from the index row, or any paraphrase of the invariant's content.
- test-agent.md explicitly documents: "In the `missing` category, output INV-IDs only. Do NOT cross-reference `index.md` or shard files to resolve full entry text. The ID alone is sufficient for the structured output."
- The advisor does NOT read `invariants-architecture.md` in order to produce the `missing` output (it reads the index to find the ID, but stops there without reading the shard entry text).

## Failure Mode
If the advisor output includes INV-0003's rule text (e.g., "Every spec must declare the invariants it touches — missing scenario coverage"), that constitutes a transitive index/shard content exposure. spec-agent might pass that rule text to code-agent context, which could then expose invariant details that should remain internal.

## Notes
Covers FR-17 (ID-only missing category), BR-7 (advisor structured only; ID-only missing), EC-35. This is a subtle information barrier scenario — the restriction is not about holdout content (the usual concern) but about index/shard content leaking transitively through advisor output to code-agents. The rule is defensive: even if individual invariant entries are not secret, keeping them out of advisor output prevents the advisor from becoming a general-purpose index resolver.
