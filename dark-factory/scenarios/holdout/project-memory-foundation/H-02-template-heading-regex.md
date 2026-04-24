# Scenario: Index entry heading rows match the machine-parseable format regex

## Type
edge-case

## Priority
critical — architect-agent's future invariant probe will grep index headings without LLM help. If the format drifts, the probe silently returns zero matches.

## Preconditions
- `dark-factory/memory/index.md` exists.
- The index ships with zero entry rows on first install.

## Action
Read `index.md`. Find every line that starts with `## ` (second-level heading). For each such line, test it against the index entry heading regex:
```
^## (INV|DEC|FEAT)-\d{4} \[type:[a-z]+\] \[domain:[a-z—-]+\] \[tags:[^\]]*\] \[status:[a-z—-]+\] \[shard:[a-z0-9._-]+\]$
```

For the freshly shipped empty index, verify:
- Zero `## ` headings exist in the body (confirms entryCount: 0 is honest).

For simulation purposes (or if any future entries exist), verify:
- Every `## ` heading in the body matches the regex above.
- FEAT entries use `[domain:—]` and `[status:—]`.
- No heading uses the form `## INV-TEMPLATE:` or `## DEC-TEMPLATE:` — those patterns are banned from the index.

For shard files (`invariants-*.md`, `decisions-*.md`):
- Verify that if entries exist, they match the entry heading form: `^## (INV|DEC)-(\d{4}|TBD-[a-z0-9-]+): .+$`
- Freshly shipped shard files have zero headings — verify.

## Expected Outcome
- Fresh install: index body has zero `## ` headings; all six shards have zero `## ` headings; ledger has zero `## ` headings.
- Any index entry rows that exist match the bracket-metadata format precisely.
- No TEMPLATE-style headings appear in any file (index or shards).

## Notes
Validates FR-3, FR-6, NFR-4. The heading regex is load-bearing because later sub-specs rely on it for grep-based probes. This scenario replaces the old H-02 which validated TEMPLATE heading regex across the old three-file layout.
