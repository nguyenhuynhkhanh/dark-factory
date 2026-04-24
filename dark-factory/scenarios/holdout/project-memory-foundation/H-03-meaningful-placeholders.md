# Scenario: project-memory-template.md example entries are meaningful, not lorem ipsum or gibberish

## Type
edge-case

## Priority
high — the template is the schema reference that onboard-agent and promote-agent will copy from. Gibberish examples teach nothing and invite copy-paste errors.

## Preconditions
- `dark-factory/templates/project-memory-template.md` exists.

## Action
Read the template file. For each file-type section (index entries, invariants, decisions, ledger), locate the complete valid example entry. Extract the title (text in the entry heading after the ID) and the primary body field (`rule` / `decision` / `summary`). Test each against a blocklist and a content-quality heuristic.

## Expected Outcome
- Example entry titles do NOT contain any of: `lorem`, `ipsum`, `foo`, `bar`, `baz`, `placeholder title`, `example entry`, a bare empty string, or the literal word `TODO`.
- Body content for `rule` / `decision` / `summary` contains at least one real project-domain word such as `spec`, `memory`, `invariant`, `decision`, `promote`, `architect`, `agent`, `shard`, `index`, or another identifiable Dark Factory concept.
- Each example title, if read out loud, describes a realistic invariant/decision/feature that could plausibly exist in a real project.
- The example index row (if present in the template) uses realistic bracket metadata (`[type:invariant]`, `[domain:architecture]`, etc.) and not placeholder values like `[domain:X]`.

## Notes
Validates FR-11 (template completeness), EC-8. This scenario shifts focus from TEMPLATE entries in shard files (which no longer exist) to the example entries in the canonical template file. Catches the failure mode where a code-agent cargo-cults the structure but ships generic placeholder text in the documentation.
