# Scenario: Override — developer forces --leads=3 on a 1-lead feature

## Type
feature

## Priority
high — the override mechanism is a safety valve; if it does not work, developers cannot correct a bad scope evaluation

## Preconditions
- `dark-factory/code-map.md` exists and shows the implied module with blast radius of 1
- The feature description would score 1 lead under normal evaluation (all five criteria satisfied)
- Developer runs: `/df-intake --leads=3 Add a timeout parameter to the df-intake skill trigger line`

## Action
The orchestrator parses the `--leads=3` flag from the command. It runs scope evaluation on the description (which would normally yield 1 lead) but the override takes precedence.

## Expected Outcome
1. The orchestrator emits a scope evaluation block showing the criteria analysis. The block ends with a note that the override was applied:
   ```
   Scope evaluation:
   - Files implied: 1 (df-intake/SKILL.md)
   - Concern type: single
   - Cross-cutting keywords: none
   - Ambiguity markers: none
   - Code-map blast radius: 1 module
   → Algorithm result: 1 lead. All criteria satisfied.
   Override: --leads=3 applied. Spawning 3 leads.
   ```
2. THREE spec-agents are spawned in parallel despite the algorithm result of 1 lead.
3. The full 3-lead flow runs (Steps 1 through 3 inclusive, with synthesis).
4. The rest of the pipeline is unchanged.

## Failure Mode
If the override is applied but the scope evaluation block is suppressed or does not show the algorithm's true result, the developer cannot see whether the override was necessary. This violates FR-6.

If the override is ignored and only 1 lead is spawned, the implementation has failed to parse the `--leads=3` flag.

## Notes
The symmetric case (`--leads=1` on a feature that would normally get 3 leads) is equally important but is a holdout scenario (EC-5) because it exercises the override in the direction that reduces coverage — a stronger validation point.

Invalid override values (`--leads=0`, `--leads=2`) are covered by AC-10; they are not tested by this scenario.
