## Key Decisions Made
- Shard-first, index-last write ordering locked: ORPHANED_SHARD is the chosen partial-failure recovery path (detectable and repairable) rather than PHANTOM_INDEX (data loss).
- Pre-existing regression warns-and-proceeds — a failing promoted test whose Guards don't reference this spec's files must not block promotion. Prevents "one stale test halts the shop."
- Expected regression does not loop code-agent — spec-declared Modifies/Supersedes pre-approves the invariant change; the promoted test is obsolete and will be updated by a future promote-agent cycle.
- Advisor mode uses structured-output-only protocol with ID-only missing category — the schema constraint is the actual holdout-barrier enforcement mechanism, not a convention.
- Single-writer serialized by waves: no new coordination primitives needed; existing wave semantics provide the concurrency guarantee.
- test-agent `mode` defaults to `validator` when omitted — fully backward compatible with all existing callers.

## Remaining Notes
- Advisor output schema should appear as an explicit JSON-ish table in test-agent.md so the structural-output barrier cannot be bypassed accidentally.
- The "re-read at commit time" (BR-11) should be documented in promote-agent.md as occurring immediately before each write operation to make the temporal relationship explicit.
- The new manifest fields (preExistingRegression, expectedRegression, testAdvisoryCompleted, regressionGate) should appear in the df-orchestrate final summary documentation section.
