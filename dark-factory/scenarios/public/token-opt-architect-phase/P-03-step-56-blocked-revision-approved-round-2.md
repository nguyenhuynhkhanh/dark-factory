# Scenario: Step 5.6 BLOCKED — Spec-Agent Revises — APPROVED on Round 2

## Type
feature

## Priority
critical — spec revision in df-intake is the primary value proposition of this feature

## Preconditions
- df-intake has completed Steps 1–5.5 for spec `my-feature`
- `dark-factory/specs/features/my-feature.spec.md` exists (Tier 2)
- No manifest entry, no findings.md

## Action

**Round 1:**
df-intake runs Step 5.6 architect review. One domain agent (Architecture & Performance) returns BLOCKED with reason: "The spec requires shared state mutation across worktrees but provides no concurrency control strategy — this will produce data races."

Synthesized verdict: **BLOCKED**.

df-intake spawns spec-agent with:
- The blocked domain's findings
- The original spec
- Instruction to revise the spec to address the blocker

Spec-agent updates `my-feature.spec.md` in place with a concurrency control section.

**Round 2:**
df-intake re-runs Step 5.6 architect review on the revised spec.
All three domain agents return APPROVED.
Synthesized verdict: **APPROVED**.

## Expected Outcome

### Round 1 behavior
- No manifest entry written during Round 1
- No findings.md written during Round 1
- Spec-agent is spawned with ONLY the architectural findings (not test/scenario content — information barrier preserved)
- `my-feature.spec.md` is updated on disk with the revision

### Round 2 behavior
- Architect review runs again with the revised spec
- All domains approve

### Post-Round-2 state
- `dark-factory/specs/features/my-feature.findings.md` written
- Manifest entry created with `architectReviewedAt`, `findingsPath`, `architectReviewedCodeHash`
- Round count for the architect review phase is tracked (total rounds used: 2 of max 5)

### What does NOT happen
- Step 5.6 does NOT spawn a code-agent
- Spec-agent revision does NOT receive holdout scenario content
- Architect-agent does NOT receive scenario advisory output from Step 5.5

## Notes
This scenario maps to AC-4, FR-3, BR-6 (parallel is NOT triggered here since one domain was BLOCKED).
The information barrier "architect-agent communicates ONLY about spec content — never about tests" must be preserved when spawning spec-agent for revision. This is the same constraint as in the existing implementation-agent BLOCKED path.
