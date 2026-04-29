## Architect Review: ao-design-intent

### Rounds: 1

### Status: APPROVED

### Key Decisions Made

- **DI shard schema in project-memory-template.md as canonical source**: The spec correctly designates `project-memory-template.md` as the sole schema definition for DI entries. No agent prompt embeds DI schema inline. This keeps the schema in one place and allows consumers to reference it.

- **SUGGESTION/CONCERN/never-BLOCKER enforcement boundary**: The spec establishes an inviolable rule that absence of `## Design Intent` on a Tier 3 spec emits SUGGESTION at most, and empty `Drift risk` on a cross-cutting spec emits CONCERN at most (never BLOCKER). This boundary is tested by assertions in `tests/dark-factory-setup.test.js` to prevent silent escalation by future edits.

- **DI entries in separate shard files, not co-mingled with INV/DEC**: The decision (DEC-TBD-a) to use three new shard files rather than appending to existing decision shards is architecturally sound. It preserves shard coherence, avoids all-consumer type-filtering on every read, and enables per-type token budgets.

- **Promote-agent as sole DI writer (single-writer protocol extended)**: INV-TBD-a correctly extends the existing single-writer protocol to cover DI shards. Onboard-agent as the Bootstrap Write Exception holder is appropriate since it runs outside the spec lifecycle.

- **Additive-only migration**: The spec's Migration section is accurate — all changes are additive. No existing INV/DEC entries are modified, no index entries are deleted, and the new `[type:design-intent]` value is invisible to existing type-based consumers.

### Memory Findings

**Security:** Memory probe skipped — registry is bootstrapped empty (index exists but has zero entries).

**Architecture:** INV-TBD-a, INV-TBD-b, INV-TBD-c are well-formed with required fields (title, rule, scope, domain, enforced_by, rationale). DEC-TBD-a, DEC-TBD-b are well-formed with required fields.

**API:** No API-domain invariants or decisions in scope.

### Remaining Notes

- The spec's 3-track parallel implementation plan (Track A: memory schema + shards; Track B: spec template + spec-agent + context rule; Track C: architect + onboard + promote agents) cleanly separates file ownership with zero overlap. Implementation can proceed in parallel.

- Test assertions in AC-15 (FR-17) must assert exact enforcement-level language — the spec's Implementation Notes are clear: assert for "SUGGESTION" + "never CONCERN" + "never BLOCKER" appearing in architect-agent content.

- The spec's EC-3 (invalid domain `performance`) correctly maps to the existing `[UNCLASSIFIED DOMAIN]` tag mechanism. No special handling needed.

- Plugin mirror parity (FR-16/AC-14) applies to all 6 source files — implementation must write both source and plugin mirror in each track.
