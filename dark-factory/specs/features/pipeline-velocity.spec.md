# Feature: pipeline-velocity

## Context

The Dark Factory pipeline currently enforces a mandatory 3-round sequential architect review for every spec regardless of size or risk. A one-line documentation fix goes through the same review gauntlet as a major architectural overhaul. This creates unnecessary latency for low-risk changes and wastes architect capacity on trivial reviews.

Additionally, architect review findings (key decisions and constraints) are discarded after review -- the code-agent starts implementation with only the spec and public scenarios, missing valuable architectural context that was already established during review.

Finally, the legacy `scripts/init-dark-factory.js` duplicates all agent/skill content as template literals, creating a dual-source-of-truth maintenance burden. This script has been superseded by `bin/cli.js` + `template/` directory.

**Business value**: Faster cycle time for small/medium changes. Better implementation quality by forwarding architect decisions to code-agents. Reduced maintenance burden by eliminating the legacy init script.

## Scope

### In Scope (this spec)
- Scope-based review gating that routes specs to the appropriate review depth
- Parallel domain-focused architect review for large/x-large specs
- Forwarding architect review findings to code-agents as supplementary context
- Deleting the legacy `scripts/init-dark-factory.js`
- Updating tests to reflect the new review model
- Mirroring all agent/skill/rule changes into `template/` directory

### Out of Scope (explicitly deferred)
- Automated scope estimation (the spec author manually provides the Implementation Size Estimate; no static analysis tooling)
- Caching or memoization of architect reviews across features
- Per-domain architect agent files (we keep a single `architect-agent.md` with domain parameterization)
- Changes to the spec-agent, debug-agent, or intake pipeline
- Changes to the promote or archive lifecycle
- CI/CD integration for review automation

### Scaling Path
- If domain-focused reviews prove valuable, individual domain agents could be extracted to separate files with specialized prompts
- If automated scope estimation is needed, a pre-review analysis step could parse the spec's file list against a complexity heuristic
- The always-review pattern list could be made configurable via project profile

## Requirements

### Functional

- FR-1: **Review gating step** -- The orchestrator must evaluate the spec's Implementation Size Estimate section before deciding review depth. This evaluation happens after pre-flight checks and before any architect review. Rationale: prevents unnecessary review overhead for low-risk changes.

- FR-2: **Scope tier routing** -- Based on the spec's estimated scope size and affected files:
  - `small` (1-2 files, no high-risk patterns): skip architect review entirely
  - `medium` (3-5 files): single architect round (one pass, all domains)
  - `large` / `x-large` (6+ files): full parallel domain review
  Rationale: right-sizes review effort to change risk.

- FR-3: **Always-review pattern matching** -- Changes touching any of these patterns must receive at least `medium` review regardless of file count: authentication/authorization modules, database migrations, security middleware, database schemas, API contracts/route definitions. The orchestrator checks the spec's affected files/modules list against these patterns. Rationale: high-risk areas need review even for small changes.

- FR-4: **Developer override** -- The developer can explicitly request full review for any tier by passing a flag or responding to a prompt. Rationale: developer judgment should always be respected.

- FR-5: **Safe default for missing estimates** -- If the spec has no Implementation Size Estimate section, default to full review (large-scope behavior). Rationale: when risk is unknown, assume the worst.

- FR-6: **Parallel domain architect review** -- For large/x-large scope, spawn 3 architect-agents in parallel, each focused on one domain:
  - Security and data integrity (auth, sanitization, data exposure, migrations, concurrent writes)
  - Architecture and performance (module boundaries, patterns, N+1 queries, caching, scalability)
  - API design and backward compatibility (contracts, versioning, error handling, observability)
  Rationale: parallelism reduces wall-clock time for thorough reviews.

- FR-7: **Single architect-agent with domain parameter** -- The existing `architect-agent.md` gains a domain parameter that narrows its review focus. No new agent files are created. Rationale: avoids agent sprawl and keeps the agent list predictable.

- FR-8: **Architects report only** -- In parallel review mode, architect-agents produce domain-specific review files but do NOT spawn spec-agents or write to the spec. Only the orchestrator synthesizes and spawns a single spec-agent for all changes. Rationale: prevents conflicting spec edits from concurrent agents.

- FR-9: **Strictest-wins aggregation** -- Any BLOCKED from any domain results in overall BLOCKED. Contradictions between domain reviews are escalated to the developer. Rationale: security and architecture concerns must not be overridden by other domains.

- FR-10: **Follow-up verification** -- After the spec-agent addresses all findings, an optional verification round checks the updated spec. Maximum 3 total passes (initial parallel + up to 2 follow-ups). Only triggered if new blockers are found. Rationale: caps review cycles while allowing necessary iteration.

- FR-11: **Domain review file naming** -- Individual domain reviews written to `{name}.review-security.md`, `{name}.review-architecture.md`, `{name}.review-api.md` in the appropriate specs directory. Final synthesized review written to `{name}.review.md` (backward compatible). Rationale: preserves existing review file contract.

- FR-12: **Review findings forwarded to code-agent** -- After architect review completes (APPROVED or APPROVED WITH NOTES), the orchestrator extracts "Key Decisions Made" and "Remaining Notes" sections from the review file and passes them to code-agents as supplementary context. Round-by-round discussion is stripped to protect the information barrier. Rationale: code-agents benefit from architectural constraints without seeing test-adjacent discussion.

- FR-13: **Findings forwarding for cached reviews** -- When re-running orchestration and an APPROVED review already exists, the orchestrator still reads and forwards the review findings to code-agents. Rationale: cached reviews should not degrade implementation quality.

- FR-14: **No findings for skipped reviews** -- Small-scope features that skip review have no findings to forward. Code-agent behavior is unchanged for these. Rationale: no-op path must be explicit.

- FR-15: **Post-hoc file count comparison** -- After implementation completes, the orchestrator compares estimated file count from the spec against actual files modified, logging the delta in the manifest. Rationale: improves future estimation accuracy and catches scope creep.

- FR-16: **Delete legacy init script** -- Remove `scripts/init-dark-factory.js`. The `bin/cli.js` + `template/` directory is the canonical installation path. Rationale: eliminates dual-source-of-truth maintenance burden.

- FR-17: **Applies to both features and bugfixes** -- The review gating, parallel review, and findings forwarding apply identically to feature specs and bugfix debug reports. High-risk file patterns trigger review for bugfixes too. Rationale: risk is risk regardless of pipeline mode.

### Non-Functional

- NFR-1: **No new dependencies** -- All changes must use only Node.js built-ins and existing Claude Code tools. Rationale: zero-dependency constraint is a core project principle.

- NFR-2: **Backward compatibility of review files** -- The synthesized `{name}.review.md` must maintain the same format (Status, Key Decisions Made, Remaining Notes, Blockers) so that existing orchestration logic for reading cached reviews continues to work. Rationale: in-flight features should not break.

- NFR-3: **Information barrier preservation** -- The findings forwarded to code-agents must NOT contain any content that could hint at holdout scenario themes. Only "Key Decisions Made" and "Remaining Notes" sections are safe to forward. Rationale: this is the project's core integrity constraint.

## Data Model

### Manifest Schema Changes

Add the following fields to each feature entry in `dark-factory/manifest.json`:

```json
{
  "features": {
    "example-feature": {
      "status": "active",
      "scopeSize": "small | medium | large | x-large",
      "reviewMode": "skipped | single-round | parallel-full",
      "estimatedFiles": 2,
      "actualFiles": null,
      "created": "...",
      "passed": null,
      "promoted": null,
      "archived": null
    }
  }
}
```

- `scopeSize`: extracted from spec's Implementation Size Estimate. Null if not present.
- `reviewMode`: set by the review gating step. Reflects what actually happened.
- `estimatedFiles`: integer from spec. Null if not present.
- `actualFiles`: integer, set after implementation completes (post-hoc check). Null until then.

These fields are additive -- existing manifest entries without them continue to work (treated as null).

### Review File Structure

New domain-specific review files alongside the existing review file:

```
dark-factory/specs/features/
  {name}.spec.md          (existing)
  {name}.review.md        (existing format -- now synthesized from domain reviews)
  {name}.review-security.md      (new -- Security & data integrity domain)
  {name}.review-architecture.md  (new -- Architecture & performance domain)
  {name}.review-api.md           (new -- API design & backward compat domain)
```

Each domain review file follows this format:

```md
## Domain Review: {Security & Data Integrity | Architecture & Performance | API Design & Backward Compatibility}

### Feature: {name}
### Status: APPROVED / APPROVED WITH NOTES / BLOCKED

### Findings
- **Blockers**: ...
- **Concerns**: ...
- **Suggestions**: ...

### Key Decisions
- {decision}: {rationale}
```

## API Endpoints

N/A -- This feature modifies agent/skill definitions (markdown prompt files) and a test file. There are no HTTP APIs.

## Business Rules

- BR-1: **Scope tier is determined by file count AND risk patterns** -- A 2-file change touching auth middleware is `medium`, not `small`. File count sets the floor; risk patterns can only elevate, never lower. Why: prevents high-risk changes from slipping through.

- BR-2: **Always-review patterns are checked against the spec's affected files list** -- The orchestrator pattern-matches file paths and module names from the spec against: `auth`, `migration`, `security`, `middleware`, `schema`, `database`, `api contract`, `route`. This is substring matching, not exact match. Why: specs describe affected areas in natural language; fuzzy matching is more reliable.

- BR-3: **Developer override is irrevocable for the current run** -- Once a developer requests full review, the orchestrator does not re-evaluate scope. Why: prevents confusion from mid-run scope changes.

- BR-4: **Contradiction escalation is blocking** -- If two domain architects produce contradictory recommendations (e.g., Security says "add field encryption" and Architecture says "keep schema simple"), the orchestrator presents both positions to the developer and waits for a decision. Neither recommendation is silently dropped. Why: domain expertise should inform, not decide.

- BR-5: **Findings extraction is whitelist-based** -- Only "Key Decisions Made" and "Remaining Notes" sections are forwarded. Any other section (including round discussion if present in older reviews) is stripped. Why: defense-in-depth for information barrier.

- BR-6: **Post-hoc file count uses git diff** -- Actual file count is determined by counting distinct files modified in the implementation (not files read or created temporarily). Why: accurate measurement of implementation scope.

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| Spec has no Implementation Size Estimate | Default to full review, warn developer | Log warning to console |
| Always-review pattern match on small spec | Elevate to medium review, inform developer | Update manifest `reviewMode` to `single-round` |
| One domain architect fails/times out | Report which domain failed, offer retry or proceed with available reviews | Domain review file not created |
| All three domain architects BLOCK | Overall BLOCKED, present all blockers to developer | Synthesized review written as BLOCKED |
| Domain reviews contradict | Escalate to developer with both positions | Block until developer resolves |
| Review findings extraction finds no Key Decisions | Pass empty findings context to code-agent (no-op) | None |
| Post-hoc file count cannot be determined | Set `actualFiles` to null in manifest | Log warning |
| Legacy init script referenced after deletion | Test suite no longer tests init script scaffold | Tests updated to remove init script assertions |

## Acceptance Criteria

- [ ] AC-1: Small-scope specs (1-2 files, no high-risk patterns) skip architect review entirely and proceed directly to implementation
- [ ] AC-2: Medium-scope specs (3-5 files) receive exactly one architect review round covering all domains
- [ ] AC-3: Large/x-large specs spawn 3 parallel domain-focused architect-agents
- [ ] AC-4: Specs affecting auth, migrations, security middleware, database schemas, or API contracts receive at least medium review regardless of file count
- [ ] AC-5: Developer can override to full review for any spec
- [ ] AC-6: Missing Implementation Size Estimate defaults to full review
- [ ] AC-7: architect-agent.md accepts a domain parameter that narrows review focus
- [ ] AC-8: Domain architects produce separate review files (`{name}.review-{domain}.md`)
- [ ] AC-9: Orchestrator synthesizes domain reviews into a single `{name}.review.md` with backward-compatible format
- [ ] AC-10: Any domain BLOCKED = overall BLOCKED
- [ ] AC-11: Contradictions between domains are escalated to developer
- [ ] AC-12: Maximum 3 total review passes for parallel review mode
- [ ] AC-13: Code-agent receives "Key Decisions Made" and "Remaining Notes" from review file
- [ ] AC-14: Round-by-round discussion is NOT forwarded to code-agent
- [ ] AC-15: Cached APPROVED reviews still forward findings on re-run
- [ ] AC-16: Small-scope skipped reviews pass no findings (no-op)
- [ ] AC-17: Post-hoc file count logged in manifest after implementation
- [ ] AC-18: `scripts/init-dark-factory.js` is deleted
- [ ] AC-19: Test suite updated: init script scaffold tests removed, new review gating tests added
- [ ] AC-20: All changes mirrored in `template/` directory
- [ ] AC-21: Bugfixes use identical review gating rules as features
- [ ] AC-22: Information barriers remain intact -- no holdout content reaches code-agent, no scenario content reaches architect-agent

## Edge Cases

- EC-1: **Spec lists 2 files but one is a migration** -- Elevated to medium despite small file count. The always-review check runs AFTER scope tier assignment and can only elevate.
- EC-2: **Developer overrides to full review on a small spec** -- Full parallel review runs even though the spec is small. Developer judgment takes precedence.
- EC-3: **Domain architect produces APPROVED WITH NOTES while another produces BLOCKED** -- Overall status is BLOCKED. The APPROVED WITH NOTES domain's findings are included in the synthesized review but do not override the block.
- EC-4: **Spec has Implementation Size Estimate but no file list** -- Scope size is used for tier assignment but always-review check cannot run (no files to match). Default behavior: use the stated tier without elevation.
- EC-5: **Re-run with cached domain review files but missing synthesized review** -- Orchestrator re-synthesizes from domain files. Does not re-run architect agents.
- EC-6: **Post-hoc check shows 10 actual files for a "small" (2 estimated) spec** -- Delta logged in manifest. No automatic action taken (informational only for future estimation).
- EC-7: **Review file has no "Key Decisions Made" section** -- Empty findings passed to code-agent. This is a no-op, not an error.
- EC-8: **Bugfix debug report with no file list** -- Same as feature: defaults to full review when risk cannot be assessed.

## Dependencies

### Files Modified
1. **`.claude/skills/df-orchestrate/SKILL.md`** -- Major changes: add review gating logic, parallel architect spawning, findings forwarding, post-hoc file count check
2. **`.claude/agents/architect-agent.md`** -- Major changes: add domain parameter, change from 3-round sequential to single-domain-focused review, add domain review file format
3. **`.claude/agents/code-agent.md`** -- Minor changes: add "Architect Review Findings" as optional input in the Inputs section and Feature/Bugfix Mode sections
4. **`.claude/rules/dark-factory.md`** -- Moderate changes: update pipeline descriptions for review gating, parallel review, findings forwarding
5. **`scripts/init-dark-factory.js`** -- DELETE this file
6. **`tests/dark-factory-setup.test.js`** -- Update: remove init script scaffold tests (suite 10), update architect review gate tests (suite 5) for new review model
7. **`template/.claude/skills/df-orchestrate/SKILL.md`** -- Mirror orchestrator changes
8. **`template/.claude/agents/architect-agent.md`** -- Mirror architect-agent changes
9. **`template/.claude/agents/code-agent.md`** -- Mirror code-agent changes
10. **`template/.claude/rules/dark-factory.md`** -- Mirror rules changes

### Breaking Changes
- The architect-agent no longer runs 3 sequential rounds by default. Tests asserting "minimum 3 rounds" or "at least 3 rounds" must be updated to reflect the new tiered model.
- The init script scaffold test suite (suite 10) must be entirely removed since the script is deleted.
- The `dark-factory.md` rules file pipeline descriptions change from "3+ rounds" to tiered review language.

### Modules NOT Affected
- spec-agent.md, debug-agent.md, onboard-agent.md, test-agent.md, promote-agent.md -- no changes
- df-intake, df-debug, df-onboard, df-cleanup, df-spec, df-scenario skills -- no changes
- manifest.json structure is additive only (new fields are nullable)

## Implementation Notes

### Patterns to Follow
- Agent definitions use YAML frontmatter (`name`, `description`, `tools`). The `name` field must match the filename without `.md`. Tests enforce this.
- Skill definitions use YAML frontmatter (`name`, `description`). The `name` field must match the directory name. Tests enforce this.
- Information barrier constraints are expressed as "NEVER read/modify" blocks in agent markdown. Tests verify these phrases exist.
- Template files in `template/` must be kept in sync with source files in `.claude/`. The `bin/cli.js` copies from `template/` during installation.

### Key Implementation Details
- The domain parameter for architect-agent should be passed via the agent spawn message (natural language instruction), not via frontmatter changes. The frontmatter remains unchanged.
- The review gating logic should be implemented as a new section in df-orchestrate SKILL.md, inserted between "Pre-flight Checks" and the current "Architect Review" section.
- The parallel spawn pattern already exists in df-orchestrate for code-agents (Step 1 of Feature Mode). The same "spawn in parallel, wait for all" pattern applies to architect-agents.
- For the always-review pattern matching, use substring matching against the spec content. The orchestrator reads the spec and searches for keywords: `auth`, `migration`, `security`, `middleware`, `schema`, `database`, `api contract`, `route definition`.
- The findings extraction from review files should be implemented as explicit section parsing in the orchestrator instructions -- tell the orchestrator to read only the "Key Decisions Made" and "Remaining Notes" headers and their content.
- Post-hoc file count: the orchestrator already tracks which files code-agents modify. After implementation, count distinct file paths and update the manifest.

### Test Update Strategy
- Suite 5 ("Architect review gate"): Update assertions from "minimum 3 rounds" to reflect tiered review. Add assertions for review gating, domain parameter, parallel review, and findings forwarding.
- Suite 10 ("init-dark-factory.js scaffold"): Remove entirely. The init script is deleted and `bin/cli.js` + `template/` is the canonical path. No replacement scaffold tests are needed since the template files are tested implicitly by the agent/skill existence tests (suites 1-2).
- Information barrier tests (suite 6): Add assertion that findings forwarding strips round discussion.

## Implementation Size Estimate

- **Scope size**: large (10 files modified/deleted across agents, skills, rules, tests, and templates)
- **Estimated file count**: 10
- **Suggested parallel tracks**: 2

  **Track 1 -- Core Pipeline Changes** (files 1-4):
  - `.claude/skills/df-orchestrate/SKILL.md` (review gating, parallel review, findings forwarding, post-hoc check)
  - `.claude/agents/architect-agent.md` (domain parameterization, single-domain focus)
  - `.claude/agents/code-agent.md` (architect findings input)
  - `.claude/rules/dark-factory.md` (pipeline description updates)

  **Track 2 -- Cleanup, Tests, and Templates** (files 5-10):
  - `scripts/init-dark-factory.js` (delete)
  - `tests/dark-factory-setup.test.js` (update suites 5 and 10)
  - `template/.claude/skills/df-orchestrate/SKILL.md` (mirror Track 1)
  - `template/.claude/agents/architect-agent.md` (mirror Track 1)
  - `template/.claude/agents/code-agent.md` (mirror Track 1)
  - `template/.claude/rules/dark-factory.md` (mirror Track 1)

  **Dependency**: Track 2's template mirroring depends on Track 1 completing first. The test updates and init script deletion can run in parallel with Track 1. Recommended execution: run Track 1 first, then Track 2.
