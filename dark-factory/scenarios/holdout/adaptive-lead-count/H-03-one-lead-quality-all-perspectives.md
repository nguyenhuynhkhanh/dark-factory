# Scenario: 1-lead quality — single lead output contains all three perspective sections

## Type
edge-case

## Priority
high — if the 1-lead prompt drops any of the three perspective sections, the resulting spec will have systematic blind spots (no reliability section, or no architecture section) on every small feature

## Preconditions
- All five 1-lead criteria are satisfied (simple feature, 1 file implied, no keywords, no ambiguity, low blast radius)
- Developer runs: `/df-intake Add a --timeout=N flag to the df-intake trigger line`
- The single spec-agent has completed its investigation and produced a report

## Action
Inspect the output produced by the single spec-agent (the report it returns before spec writing begins).

## Expected Outcome
The single lead's report contains ALL of the following named sections (exact names or close equivalents):

**From original Lead A (user/product perspective):**
- "Users & Use Cases" (or "Who Uses This")
- "Proposed Scope" (or "Scope")
- "User-Facing Requirements" (or "Functional Requirements")
- "Acceptance Criteria"
- "UX Edge Cases"

**From original Lead B (architecture/integration perspective):**
- "Affected Systems"
- "Architecture Approach" (or "Technical Architecture")
- "Data Model"
- "API Design"
- "Integration Points"
- "Technical Risks"

**From original Lead C (reliability perspective):**
- "Failure Modes"
- "Concurrency & Race Conditions" (or "Concurrency")
- "Security Considerations" (or "Security")
- "Data Integrity"
- "Backward Compatibility"
- "Edge Cases"

**Shared:**
- "Questions for Developer"

All 18+ sections (or their close equivalents) must be present. A report that is missing the entire Lead B or Lead C block is a failure.

The report must be substantively populated — sections must not be empty or contain only "N/A" unless the specific section genuinely does not apply to the feature (e.g., "Data Model: N/A — no schema changes" is acceptable; "Data Model: " with nothing is not).

## Failure Mode
If the single lead's report is missing the Failure Modes, Concurrency, or Security sections, the spec will be written without reliability input. Small features with security implications (even a new flag) can introduce vulnerabilities if the reliability perspective is absent.

If the single lead's report reads like only a Lead A report (user stories only), the 1-lead prompt was not correctly constructed as the union of A + B + C.

## Notes
This holdout scenario cannot be replaced by a structural test that checks for section header strings — it requires evaluating the substantive content of the lead's report. A code-agent that adds the section headers but leaves them empty would pass a structural check but fail this scenario.

The scenario is a holdout because if the code-agent sees it, it might write a 1-lead prompt that includes all headers but fills them with boilerplate — the holdout validator must check for substance, not just presence.
