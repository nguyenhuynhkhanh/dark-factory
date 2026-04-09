# Scenario: 1-lead path — small feature, all criteria met

## Type
feature

## Priority
critical — this is the primary new execution path; if the 1-lead selection and spawn are broken, the whole feature is broken

## Preconditions
- `dark-factory/project-profile.md` exists and contains an Architecture section
- `dark-factory/code-map.md` exists and shows the implied module with blast radius of 1 (single module, not listed in Shared Dependency Hotspots)
- No existing active specs in `dark-factory/manifest.json` that overlap with the described files
- Developer runs: `/df-intake Add a timeout parameter to the df-intake skill trigger line`

## Action
The orchestrator runs `/df-intake` with the description above.

Expected scope evaluation reasoning:
- Files implied: 1 (df-intake/SKILL.md)
- Concern type: single (SKILL.md trigger syntax only)
- Cross-cutting keywords: none
- Ambiguity markers: none
- Code-map blast radius: 1 module

## Expected Outcome
1. The orchestrator emits a scope evaluation block BEFORE spawning any leads. The block reads approximately:
   ```
   Scope evaluation:
   - Files implied: 1 (df-intake/SKILL.md)
   - Concern type: single
   - Cross-cutting keywords: none
   - Ambiguity markers: none
   - Code-map blast radius: 1 module
   → 1 lead. All criteria satisfied.
   ```
2. Exactly ONE spec-agent is spawned (not three).
3. The single spec-agent prompt contains ALL of the following section headers: "Users & Use Cases", "Proposed Scope", "User-Facing Requirements", "Acceptance Criteria", "UX Edge Cases", "Affected Systems", "Architecture Approach", "Data Model", "API Design", "Integration Points", "Technical Risks", "Failure Modes", "Concurrency & Race Conditions", "Security Considerations", "Data Integrity", "Backward Compatibility", "Edge Cases", "Questions for Developer".
4. After the lead completes, the orchestrator presents the report WITHOUT a synthesis phase — it goes directly from lead output to Step 3 (present to developer).
5. Step 3 output does NOT contain the phrases "Lead A", "Lead B", "Lead C", "all leads agreed", "leads disagreed", or any phrasing that implies multiple leads ran.
6. Step 3 uses neutral phrasing such as "The investigation found..." or "Here is what the spec lead found..."
7. The rest of the pipeline (decomposition analysis, spec writing, manifest update, scenarios) proceeds identically to the existing 3-lead flow.

## Failure Mode
If the scope evaluation block is missing from the output (emitted after leads are already spawned), the implementation violates FR-1 and BR-5. The developer cannot interrupt before token spend.

If the single lead's prompt omits any of the three original perspective sections, the implementation violates BR-4 and AC-5.

## Notes
This scenario validates the core happy path for the 1-lead branch. The signal to look for is: one Agent tool call in Step 1 (not three), and no "synthesize" step between Step 1 and Step 3.
