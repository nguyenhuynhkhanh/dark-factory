# Scenario: 3-lead path — cross-cutting keyword present

## Type
feature

## Priority
critical — the 3-lead path must remain unchanged from pre-feature behaviour; any regression here breaks all existing complex features

## Preconditions
- `dark-factory/project-profile.md` exists
- `dark-factory/code-map.md` may or may not exist (this scenario tests the 3-lead trigger on keyword alone)
- Developer runs: `/df-intake Redesign the pipeline orchestration so all agents share a common context object`

## Action
The orchestrator runs `/df-intake` with the description above.

Keyword analysis: "pipeline" is a cross-cutting keyword. Criterion C3 is false. Therefore 3 leads must be selected regardless of other criteria.

## Expected Outcome
1. The orchestrator emits a scope evaluation block BEFORE spawning any leads. The block identifies the cross-cutting keyword:
   ```
   Scope evaluation:
   - Files implied: multiple (pipeline orchestration spans multiple agents/skills)
   - Concern type: mixed (orchestration + agent behaviour + shared state)
   - Cross-cutting keywords: found: "pipeline"
   - Ambiguity markers: none
   - Code-map blast radius: unknown or high
   → 3 leads. Cross-cutting keyword "pipeline" detected.
   ```
2. THREE spec-agents are spawned in parallel (Lead A, Lead B, Lead C) with their original distinct prompts — unchanged from pre-feature behaviour.
3. Step 2 (synthesize) runs as before — merging findings from all three leads.
4. Step 3 phrasing reflects multiple leads (e.g., "Lead A found...", "leads agreed...").
5. The frontmatter `description` field of the df-intake SKILL.md reads "Spawns 1 or 3 spec-agents based on scope" (not the old "3 parallel spec-agents").
6. The plugin mirror at `plugins/dark-factory/skills/df-intake/SKILL.md` is byte-for-byte identical to `.claude/skills/df-intake/SKILL.md`.
7. CLAUDE.md contains "1 or 3 spec-agents based on scope" for the df-intake entry.
8. `.claude/rules/dark-factory.md` contains "1 or 3 spec-agents based on scope" for the df-intake entry.

## Failure Mode
If only 1 lead is spawned despite the cross-cutting keyword, the implementation has a bug in criterion C3 evaluation. The feature description was not correctly scanned for the keyword "pipeline".

If the plugin mirror diverges from the source, the implementation violates FR-9 and will fail the existing test at `tests/dark-factory-setup.test.js` line 853.

## Notes
This scenario serves double duty: it validates the 3-lead path is unchanged, AND it validates the documentation/mirror updates that are part of this feature. Checking the frontmatter, mirror, and doc files here ensures those track B/C changes are confirmed in at least one scenario.
