# Scenario: Architect agent accepts domain parameter for focused review

## Type
feature

## Priority
critical -- validates the domain parameterization design

## Preconditions
- `architect-agent.md` has been updated to support a domain parameter
- A large-scope feature is being reviewed

## Action
The orchestrator spawns an architect-agent with domain parameter "Security & Data Integrity".

## Expected Outcome
- The architect-agent is spawned using the same `.claude/agents/architect-agent.md` file (no separate domain agent files)
- The domain parameter is passed via the spawn message (natural language instruction), not via frontmatter
- The architect-agent's frontmatter remains unchanged (name: `architect-agent`, same description, same tools)
- The architect-agent narrows its review focus to the specified domain:
  - Security & Data Integrity: auth, sanitization, data exposure, migrations, concurrent writes
  - Architecture & Performance: module boundaries, patterns, N+1 queries, caching, scalability
  - API Design & Backward Compatibility: contracts, versioning, error handling, observability
- The architect-agent produces a domain-specific review file (e.g., `test-feature.review-security.md`)
- The architect-agent does NOT spawn spec-agents or write to the spec
- The architect-agent does NOT review domains outside its assignment

## Notes
The domain parameter should be clearly documented in architect-agent.md so the orchestrator knows exactly how to invoke it. The agent should acknowledge its domain focus in the review output.
