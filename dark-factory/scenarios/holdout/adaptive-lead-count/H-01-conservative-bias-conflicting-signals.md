# Scenario: Conservative bias — conflicting signals (simple description, high blast radius)

## Type
edge-case

## Priority
critical — the conservative bias rule is the safety net for the entire scope evaluation algorithm; if it fails, complex features get under-staffed specs

## Preconditions
- `dark-factory/code-map.md` exists and lists the implied module (e.g., "df-intake skill") under the **Shared Dependency Hotspots** section with a note about high coupling or many dependents
- The feature description is short, single-concern, and uses no cross-cutting keywords or ambiguity markers
- Developer runs: `/df-intake Add a --dry-run flag to df-intake`

## Action
The orchestrator runs scope evaluation on the description above.

Analysis:
- C1 (files implied): 1–2 files (df-intake/SKILL.md) → satisfies criterion
- C2 (concern type): single → satisfies criterion
- C3 (cross-cutting keywords): none → satisfies criterion
- C4 (ambiguity markers): none → satisfies criterion
- C5 (blast radius): code-map shows df-intake is a Shared Dependency Hotspot → does NOT satisfy the ≤1 module criterion

Signals conflict: description reads as simple (C1-C4 all true) but code-map blast radius is high (C5 false). Conservative bias applies.

## Expected Outcome
1. The scope evaluation block identifies the conflict explicitly:
   ```
   Scope evaluation:
   - Files implied: 1 (df-intake/SKILL.md)
   - Concern type: single
   - Cross-cutting keywords: none
   - Ambiguity markers: none
   - Code-map blast radius: high — df-intake listed in Shared Dependency Hotspots
   → 3 leads. Conflicting signals: description implies simple scope but code-map blast radius is high. Conservative bias applied.
   ```
2. THREE spec-agents are spawned.
3. The scope evaluation block explicitly states "Conservative bias applied" or equivalent language — the developer must be able to see why 3 leads were chosen despite the simple-looking description.

## Failure Mode
If the orchestrator selects 1 lead when C5 is false, the conservative bias rule (BR-2 in the spec, C5 in the algorithm) is not being enforced. Features touching hotspot modules will be underspecced.

If the output block says "1 lead" but the orchestrator then spawns 3 leads, the block is lying — this creates developer confusion.

## Notes
This is a holdout scenario because the code-agent cannot see it — the code-agent must correctly implement C5 evaluation against actual code-map content without being told explicitly what the test looks like. A unit-test mindset would check "is C5 evaluated?" but this scenario checks "is C5 evaluated correctly against real code-map structure?"
