## Domain Review: API Design & Backward Compatibility

### Feature: playwright-test-hardening
### Status: APPROVED

### Code Reality
The "API" in this context is the agent contract — the instructions that the test-agent and implementation-agent follow. The key contracts are:
1. test-agent output format (results file in `dark-factory/results/{feature}/`)
2. implementation-agent's consumption of those results
3. Information barrier rules (what each agent can/cannot see)

The spec adds a new `flaky-e2e` type and `flakyE2E` flag to the results format. This is additive: existing `e2e` and `unit` types are preserved unchanged.

### Findings

**Blockers**: None.

**Concerns**:
- The `flakyE2E` metadata flag in the results file is a new field. The implementation-agent checks for `flakyE2E: true`. This is a boolean field — backward compatible: existing results files that lack this field will be treated as non-flaky (falsy), which preserves existing behavior. APPROVED.
- The results format adds a `Dev Server` section to the test infrastructure summary. This is additive and doesn't break any consumer of the results.

**Suggestions**:
- The spec defines `flaky-e2e` as a distinct type alongside `unit` and `e2e`. Future consumers (promote-agent, etc.) should be aware of this new type. No current consumers use the type field directly — they only consume pass/fail summaries.
- The `devServerSource` field in the results metadata is a new field. It has defined values: `playwright-config`, `project-profile`, `fallback-npm`, `skipped`. This is a well-defined enum. APPROVED.

### Key Decisions
- Backward compatibility for results format: additive changes only. Old consumers see new fields as unknown (ignored) or new consumers read new fields as absent (falsy). APPROVED.
- Information barriers preserved: test-agent still never receives public scenario content; implementation-agent still never passes holdout content to code-agent. The flakiness routing adds spec-agent spawning for bugfix mode, which is a new action type but preserves all existing barriers. APPROVED.
- Single authoritative signal (`flakyE2E` boolean) rather than inferring from type counts: prevents any ambiguity in the implementation-agent's routing decision. APPROVED.

### Intent & Drift Check — API Design & Backward Compatibility
DI shard `design-intent-api.md` is empty (bootstrapped). No active entries to check for erosion/bypass. No BLOCKER.

### Memory Findings (api)
- Preserved: N/A (no active entries)
- Modified (declared in spec): N/A
- Potentially violated (BLOCKER): None
- New candidates declared: None
- Orphaned (SUGGESTION only): None
