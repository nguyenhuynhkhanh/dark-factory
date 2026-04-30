# Scenario: Tier Manually Downgraded — Step 5.6 Uses Spec File's Tier Field as Authoritative

## Type
edge-case

## Priority
medium — tier classification affects architect spawn count; a manual override must be honored, not overridden

## Preconditions
- df-intake has completed Steps 1–5 for `downgraded-spec`
- During investigation, spec-agents classified the spec as Tier 3 (5+ files, cross-cutting keywords)
- However, the developer manually edited `dark-factory/specs/features/downgraded-spec.spec.md` to change the Architect Review Tier from Tier 3 to Tier 1 before Step 5.6 runs
- The spec file now contains: `## Architect Review Tier\n- **Tier**: 1`
- df-intake proceeds to Step 5.6

## Action
df-intake Step 5.6 reads the `Architect Review Tier` field from `downgraded-spec.spec.md`. It reads Tier 1.

## Expected Outcome

### Single combined architect spawn (Tier 1 behavior)
- df-intake spawns ONE combined architect-agent (not 3 parallel domain agents)
- No domain parameter is passed
- Produces a single review (not 3 domain reviews to synthesize)

### Tier 1 behavior is honored
- The original Tier 3 classification from investigation is NOT used
- The spec file's tier field is authoritative at Step 5.6 time
- This matches the stated behavior in EC-8 and the implementation-agent note: "The `Architect Review Tier` field in the spec file is authoritative"

### Findings.md and manifest written normally
- On APPROVED: findings.md written, manifest entry with all three new fields
- `architectReviewedAt` timestamp reflects the single-agent review

### What does NOT happen
- df-intake does NOT warn the developer that the tier was downgraded from the original classification
- df-intake does NOT refuse to honor a manually-set tier
- df-intake does NOT spawn 3 architects because the original classification was Tier 3

## Notes
This scenario maps to EC-8.
This is a subtle but important behavior: the developer has explicit override power over tier classification. If the developer thinks the spec is simpler than the automated classification suggests, they can reduce the tier and get a faster (though potentially less thorough) review. The spec-file-as-authoritative principle applies consistently between df-intake Step 5.6 and implementation-agent (which also reads tier from the spec file).
