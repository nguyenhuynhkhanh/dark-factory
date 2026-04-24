# Scenario: Malformed YAML frontmatter is tolerated by the defensive parser (if one is shipped)

## Type
failure-recovery

## Priority
medium — if this spec ships a defensive parser helper, it must not throw on malformed input. If no helper is shipped, this scenario is validated indirectly by EC-2 logic being documented in the rule / template.

## Preconditions
- One of two conditions applies:
  - (a) The spec ships a parsing helper somewhere under the project; locate it.
  - (b) The spec ships NO parser. In that case, this scenario verifies that the rule file and/or the setup test explicitly document the expected behavior for malformed files.

## Action
Construct a temporary malformed copy of `dark-factory/memory/invariants-security.md`:
```
---
version: 1
lastUpdated: 2026-04-24
generatedBy: bootstrap
gitHash: TBD
[[[broken-yaml-line
---
```

Attempt to parse this malformed file.

If a helper is shipped:
- Call the helper and inspect the return value.

If no helper is shipped:
- Verify that `.claude/rules/dark-factory-context.md` or `dark-factory/templates/project-memory-template.md` explicitly documents that malformed memory files are (i) warned about and (ii) treated as empty.

## Expected Outcome
- No exception is thrown.
- Helper (if shipped) returns an empty entry set AND logs or returns a warning indicator.
- The overall behavior is: malformed file is tolerated, downstream agents proceed as if the file contained zero entries.

## Notes
Validates EC-2, Error Handling row for malformed YAML. Uses `invariants-security.md` as the test subject (one of the new shard files, replacing the old `invariants.md` reference). Forward-compatible: later sub-specs can require a stricter parser, but this foundation must at least not crash.
