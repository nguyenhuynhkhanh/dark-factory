## Domain Review: Architecture & Performance
### Feature: playwright-test-hardening
### Status: APPROVED WITH NOTES
### Reviewer Domain: Architecture & Performance

---

### Findings

#### Blockers
None.

#### Concerns

**C-1: Dev server detection cascade adds implicit coupling to external config formats** (Medium)
FR-2 defines a three-tier detection cascade: Playwright config `webServer` → project profile `Dev Server` field → package manager fallback. The test-agent now parses Playwright config files to extract `webServer` and `baseURL` properties, and reads the project profile for a dev server command. This creates implicit dependencies on the structure of two external formats (Playwright config schema and project profile table layout). If either format changes, the detection silently degrades to fallback.

**Mitigation (already in spec):** The cascade is fail-soft — each tier gracefully falls through to the next. EC-4 handles the case where all three tiers fail. This is acceptable for a markdown-defined agent, but the spec should note that the Playwright config parsing is pattern-matching (not AST parsing), so unusual config formats (e.g., programmatic configs, TypeScript configs with dynamic values) may not be detected.

**C-2: Step numbering is approaching readability limits** (Low)
The existing test-agent uses Step 0, Step 0b, Step 1, Step 2, Step 3, Step 4. This spec adds Step 0a (between 0 and 0b) and Step 2.5. While this preserves backward compatibility with documentation references, the non-sequential numbering (0 → 0a → 0b → 1 → 2 → 2.5 → 3 → 4) reduces scanability. This is not a blocker since it follows the existing convention, but a future cleanup pass to renumber steps would improve maintainability.

**C-3: Flakiness-to-spec flow creates a new agent spawn dependency** (Medium)
FR-6 introduces a new spawn path: implementation-agent → spec-agent (bugfix mode) for flaky E2E tests. This is a new cross-agent dependency that doesn't exist today. The spec handles the mixed scenario well (EC-8: parallel code-agent for clean failures + spec-agent for flaky), but the implementation-agent's Step 3 Evaluate now has three exit paths instead of one (pass → done, clean fail → code-agent, flaky → spec-agent). This branching is acceptable but increases the cognitive complexity of the evaluation step.

**Recommendation:** The spec's implementation notes for Step 3 Evaluate should include a decision flowchart comment in the agent markdown to make the three-way branch explicit and easy to follow during future modifications.

#### Suggestions

**S-1: Document Playwright `--retries` flag semantics explicitly**
FR-3 uses Playwright's built-in `--retries=2` flag, which is the right call — it avoids reimplementing retry logic. However, the spec should note that Playwright's retry behavior is per-test (not per-file), and that Playwright's JSON reporter already includes retry metadata. This means the test-agent can read flakiness data from Playwright's native output format rather than parsing stdout, which is more robust and aligns with the "use built-in tooling" pattern.

**S-2: Consider server cleanup via process group kill**
NFR-3 requires server cleanup even on agent crash. The spec says "background process management with explicit kill." For robustness, the agent instructions could recommend `kill -- -$PID` (process group kill) to also clean up child processes spawned by the dev server (e.g., webpack dev server spawns watchers). A single PID kill may leave orphaned child processes.

**S-3: The 30-second server timeout (NFR-2) may be tight for large projects**
Next.js and similar frameworks can take 30-60 seconds for initial compilation on large codebases. The spec hardcodes 30 seconds. Consider making this configurable via the project profile (e.g., a `Dev Server Timeout` field) with 30s as the default. This is minor since the fallback (skip E2E, run unit tests) is safe.

---

### Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D-1 | All logic inline in agent markdown (NFR-1) | Follows existing patterns. No external config files or shared modules. Agent definitions are self-contained. |
| D-2 | Use Playwright's native `--retries` flag instead of custom retry wrapper | Avoids reimplementing retry logic. Playwright handles per-test retry, timeout, and reporting natively. Reduces agent complexity. |
| D-3 | Fail-soft cascade for dev server detection | Three tiers (Playwright config → profile → fallback) with graceful degradation. No hard failure — worst case skips E2E and runs unit tests. Backward compatible. |
| D-4 | Flaky tests route to spec-agent, not code-agent | Correct architectural choice. Flaky tests are an infrastructure/test problem, not a code problem. Re-running code-agent wastes rounds. Routing to spec-agent creates a bugfix spec that can be investigated properly. |
| D-5 | Single code-agent track for implementation | Correct for this scope. All changes are sequential additions to two files (plus mirrors). No file overlap that would benefit from parallelism. |
| D-6 | Backend-only exclusion is absolute (BR-1) | Clean module boundary — UI Layer "none" means zero E2E logic executes. No partial execution, no configuration leakage. |

---

### Summary

The spec is well-structured and follows Dark Factory's existing architectural patterns. The changes are additive, backward-compatible, and correctly scoped to two agent definitions (plus mirrors). The key architectural decisions — using Playwright's native retry, fail-soft server detection, and routing flaky tests to spec-agent — are all sound. The main concerns are minor: implicit coupling to Playwright config format (mitigated by fail-soft cascade), growing step numbering complexity (cosmetic), and the new three-way branch in implementation-agent's evaluate step (manageable with a decision flowchart). No blockers identified.
