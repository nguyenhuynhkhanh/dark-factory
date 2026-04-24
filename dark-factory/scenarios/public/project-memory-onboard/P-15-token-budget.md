# Scenario: P-15 — Token budget preserved after Phase 3.7 addition; budget note documented

## Type
feature

## Priority
high — NFR-1, FR-24. Token caps are enforced by the existing `token-measurement` suite; overflow breaks orchestration. The token budget documentation note is a new requirement.

## Preconditions
- onboard-agent file has been updated with Phase 3.7 content including shard routing, index generation, and tags sign-off.
- `tests/dark-factory-setup.test.js` has the existing token-measurement suite (section marker `token-measurement`).

## Action
Two assertions:

**Assertion 1 — Structural (budget documentation note present):**
Structural test asserts Phase 3.7 (or Phase 7 Memory Sign-Off section) contains a note documenting the bounded token cost of the shard-aware memory layout:
- Index loading costs ≤ 4,000 tokens (or equivalent phrasing).
- Each domain shard loaded on demand costs ≤ 8,000 tokens per domain (or equivalent phrasing).
- The note must appear in the onboard-agent file so developers reading the agent understand the budget implications of growing the registry.

**Assertion 2 — Runtime (token measurement suite passes):**
Run the token-measurement suite:
```
node --test tests/dark-factory-setup.test.js
```

The test reads the onboard-agent file, estimates its token count using the project's existing estimation method (likely character/word based), and asserts the count is below the configured per-agent cap.

## Expected Outcome
- Token budget documentation note is present in Phase 3.7 (FR-24).
- Token measurement for `.claude/agents/onboard-agent.md` passes the cap.
- Token measurement for `plugins/dark-factory/agents/onboard-agent.md` passes the cap.
- No regression vs. pre-change token count that would push it over.

## Failure Mode (if applicable)
If the budget documentation note is absent, test names the missing content.
If over budget, factor Phase 3.7 into denser bullet form:
- Remove any inline multi-line ORM schema examples — keep only short phrase references.
- Compress repeated "MUST" statements into a single enumerated list.
- Compress the shard routing table into a compact two-column format.
- Merge Phase 3.7 subsections into a single section with three bullet groups if absolutely necessary (last resort, as it degrades P-02 structural assertions).

## Notes
The token-measurement suite is the canonical enforcement point. Do not introduce a new token-counting utility; reuse the existing one. The token budget documentation note itself must not be so verbose that it pushes the agent over budget — a two-bullet concise note is sufficient.
