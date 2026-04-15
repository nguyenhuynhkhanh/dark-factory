# Feature: playwright-test-hardening

## Context
The test-agent already supports Playwright detection, scenario classification, E2E test writing, and E2E test running. However, it lacks four hardening mechanisms needed for reliable E2E validation in production pipelines:

1. **Backend-only projects waste cycles** attempting Playwright detection when no UI layer exists.
2. **Dev server management is manual** -- the test-agent notes "if tests fail due to server not running" but does nothing about it, causing false negatives.
3. **Flaky E2E tests cause false failures** -- Playwright tests are notoriously flaky, but the test-agent treats a single failure as definitive.
4. **Persistent flakiness wastes code-agent rounds** -- when a test is flaky (not a code issue), the implementation-agent re-spawns code-agents to "fix" something that is not broken, burning rounds on a non-code problem.

This spec adds all four mechanisms to the test-agent and implementation-agent markdown definitions.

## Scope
### In Scope (this spec)
- **test-agent.md**: Add backend-only exclusion gate (read project profile UI Layer field, skip all E2E logic when "none")
- **test-agent.md**: Add dev server management (detect start command, start before E2E tests, stop after, with health check)
- **test-agent.md**: Add E2E retry mechanism (configurable retries, default 2, with flakiness detection)
- **test-agent.md**: Add flakiness reporting format in results output
- **implementation-agent.md**: Add flakiness-to-spec-creation flow (when test-agent reports persistent flakiness, spawn spec-agent for bugfix spec instead of re-running code-agent)
- **Plugin mirrors**: Both agent files mirrored to `plugins/dark-factory/agents/`

### Out of Scope (explicitly deferred)
- Changes to the project profile template (handled by `playwright-onboard` spec)
- Changes to the onboard-agent (handled by `playwright-onboard` spec)
- Playwright installation automation
- Visual regression testing support
- Playwright trace/screenshot artifact collection
- Changes to the code-agent, architect-agent, or any other agents

### Scaling Path
If E2E testing becomes a major pipeline concern, the dev server management and retry logic could be extracted into a dedicated "e2e-runner-agent" that the test-agent delegates to. For now, inline logic in the test-agent is sufficient given the narrow scope.

## Requirements
### Functional
- FR-1: Backend-only exclusion -- The test-agent MUST read the project profile's `UI Layer` field from the Tech Stack table. If the value is `none` (case-insensitive), skip ALL Playwright/E2E detection, classification, writing, and running. Log: "UI Layer is 'none' -- skipping E2E detection and tests." Proceed with unit tests only.
- FR-2: Dev server management -- Before running Playwright tests, the test-agent MUST ensure a dev server is running. Detection order: (1) check `playwright.config.*` for a `webServer` block -- if present, Playwright handles it natively, do nothing; (2) if no `webServer` config, read the project profile for a dev server start command (from a `Dev Server` field in Tech Stack or Environment section); (3) if neither found, attempt `npm run dev` / `pnpm dev` / `yarn dev` as fallback. Start the server, wait for it to respond on the expected port (from Playwright config `baseURL` or default 3000), then run tests. After all E2E tests complete (pass or fail), stop the server process.
- FR-3: E2E retry mechanism -- When a Playwright test fails, the test-agent MUST retry it up to a configurable number of times (default: 2 retries, so 3 total attempts). Use Playwright's built-in `--retries` flag: `npx playwright test --retries=2 {path}`. Record per-scenario: attempt count, which attempts passed/failed.
- FR-4: Flakiness detection -- A scenario is "flaky" if it fails on some attempts and passes on others within the retry window. The test-agent MUST detect this pattern and report it distinctly from clean passes and clean failures.
- FR-5: Flakiness reporting format -- In the results file, flaky scenarios MUST be reported with type `flaky-e2e` (distinct from `e2e` and `unit`), include the attempt breakdown (e.g., "Attempt 1: FAIL, Attempt 2: PASS"), and a flag `"flakyE2E": true` in the summary metadata.
- FR-6: Flakiness-to-spec flow -- When the implementation-agent reads test results and finds `"flakyE2E": true`, it MUST NOT re-spawn the code-agent for those scenarios. Instead, it MUST spawn a spec-agent in bugfix mode to write a new bugfix spec targeting the flaky test. The implementation-agent logs: "Flaky E2E detected for {scenarios}. Spawning spec-agent for bugfix spec rather than re-running code-agent."
- FR-7: Clean pass-through -- If all E2E tests pass on first attempt (no retries needed), behavior is identical to current test-agent behavior. No changes to the happy path.

### Non-Functional
- NFR-1: All logic MUST be written directly in the agent markdown files. Do not offload to external config files or the project profile.
- NFR-2: Dev server startup MUST have a timeout (default 30 seconds). If the server does not respond within the timeout, log the failure and skip E2E tests (do not block the entire validation).
- NFR-3: Dev server process MUST be cleaned up even if tests crash or the agent errors out. Use background process management with explicit kill.

## Data Model
N/A -- no database or persistent storage changes. All changes are to agent markdown definition files.

## Migration & Deployment
N/A -- no existing data affected. These are markdown definition files that are read by Claude Code at agent spawn time. The new logic is additive to existing agent behavior. Old behavior (no retries, no server management) is replaced by new behavior on next agent spawn.

**Plugin mirror sync**: After modifying `.claude/agents/test-agent.md` and `.claude/agents/implementation-agent.md`, the identical content MUST be written to `plugins/dark-factory/agents/test-agent.md` and `plugins/dark-factory/agents/implementation-agent.md`. The contracts test suite enforces exact content parity.

## API Endpoints
N/A -- no API endpoints. This feature modifies agent behavior definitions.

## Business Rules
- BR-1: Backend-only exclusion is absolute -- If UI Layer is "none", no E2E logic executes, period. No fallback, no prompt, no override.
- BR-2: Playwright `webServer` config takes priority -- If the Playwright config has a `webServer` block, the test-agent MUST NOT start its own server. Playwright handles it natively and double-starting causes port conflicts.
- BR-3: Retry is E2E-only -- The retry mechanism applies ONLY to Playwright E2E tests. Unit tests are never retried (flaky unit tests are a code problem, not an infrastructure problem).
- BR-4: Flakiness blocks code-agent, not pipeline -- Flaky tests do not fail the pipeline outright. They are routed to a bugfix spec. Clean failures (fail on all attempts) still trigger code-agent re-runs as before.
- BR-5: Server cleanup is mandatory -- The dev server process MUST be killed after E2E tests regardless of test outcome. Orphaned server processes break subsequent runs.
- BR-6: Flaky threshold is any inconsistency -- A single scenario that passes on retry after failing is "flaky." No minimum count threshold. One flaky scenario triggers the flakiness reporting.

## Error Handling
| Scenario | Response | Side Effects |
|----------|----------|--------------|
| UI Layer field missing from profile | Proceed with normal Playwright detection (backward compatible) | Log: "UI Layer field not found in profile -- proceeding with E2E detection" |
| UI Layer is "none" | Skip all E2E logic | Log: "UI Layer is 'none' -- skipping E2E detection and tests" |
| Playwright config has `webServer` | Do not start own server | Log: "Playwright webServer config detected -- server management delegated to Playwright" |
| No dev server command found | Attempt `npm run dev` fallback | Log: "No dev server command in profile -- trying npm run dev" |
| Dev server fails to start within timeout | Skip E2E tests, run unit tests only | Log: "Dev server failed to start within 30s -- skipping E2E tests" |
| Dev server port already in use | Assume server is already running, proceed | Log: "Port {port} already in use -- assuming dev server is running" |
| All E2E retries exhausted (consistent failure) | Report as FAIL (type: e2e) | Normal failure handling -- code-agent re-run |
| E2E test flaky (inconsistent across retries) | Report as FLAKY (type: flaky-e2e) | flakyE2E flag set, spec-agent spawned for bugfix |

## Acceptance Criteria
- [ ] AC-1: test-agent.md contains backend-only exclusion logic that reads UI Layer field and skips E2E when "none"
- [ ] AC-2: test-agent.md contains dev server management logic with detection, startup, health check, and cleanup
- [ ] AC-3: test-agent.md uses `--retries=2` flag for Playwright test execution
- [ ] AC-4: test-agent.md results format includes `flaky-e2e` type and `flakyE2E` metadata flag
- [ ] AC-5: implementation-agent.md contains flakiness detection in Step 3 (Evaluate) that routes flaky tests to spec-agent instead of code-agent
- [ ] AC-6: Plugin mirrors (`plugins/dark-factory/agents/test-agent.md` and `plugins/dark-factory/agents/implementation-agent.md`) contain identical content to source files
- [ ] AC-7: All existing test-agent and implementation-agent behavior is preserved (no regressions to unit test flow, information barriers, or lifecycle steps)

## Edge Cases
- EC-1: Profile exists but has no Tech Stack table -- Treat as "UI Layer field missing," proceed with normal detection
- EC-2: UI Layer field value is whitespace or empty string -- Treat as missing, proceed with normal detection
- EC-3: UI Layer field value is "None" (capitalized) or "NONE" -- Case-insensitive match, skip E2E
- EC-4: Playwright config exists but has no `webServer` AND profile has no dev server command AND `npm run dev` script does not exist -- Log all three detection failures, skip E2E, proceed with unit tests only
- EC-5: Dev server starts but responds with non-200 on health check -- Accept any HTTP response (even 500) as "server is running." Only fail if connection refused.
- EC-6: All E2E tests pass on first attempt (no retries triggered) -- Results show type `e2e` (not `flaky-e2e`), no flakiness flag, identical to pre-change behavior
- EC-7: E2E test fails on all 3 attempts (consistent failure) -- Results show type `e2e` with FAIL, not `flaky-e2e`. Code-agent re-run triggers normally.
- EC-8: Mix of flaky and consistently failing E2E tests in same run -- Flaky tests get `flaky-e2e` type, consistent failures get `e2e` type. Implementation-agent handles each type separately.
- EC-9: No Playwright installed but UI Layer is not "none" -- Existing behavior: report Playwright not installed, proceed with unit tests. Backend-only exclusion does not apply.
- EC-10: Dev server process dies mid-test -- Playwright tests fail, retries attempt to run (server still down), all retries fail. Reported as consistent failure, not flaky.
- EC-11: Port conflict on dev server start -- Detect "address already in use" error, assume server is already running, proceed with tests.

## Dependencies
- **Depends on**: `playwright-onboard` -- The test-agent reads the `UI Layer` field from the project profile's Tech Stack table. This field is added by the `playwright-onboard` spec's changes to the onboard-agent and project profile template. Without `playwright-onboard`, the UI Layer field will be missing, and the test-agent falls back to normal Playwright detection (backward compatible per EC-1).
- **Group**: playwright-e2e

## Implementation Size Estimate
- **Scope size**: small (4 files, but 2 are exact mirrors)
- **Estimated file count**: 4 (test-agent.md, implementation-agent.md, and their plugin mirrors)
- **Suggested parallel tracks**: 1 code-agent
  - **Track 1**: Modify test-agent.md (add Step 0a backend-only gate, Step 2.5 dev server management, modify Step 3 for retries, modify Step 4 for flakiness reporting) and implementation-agent.md (modify Step 3 Evaluate for flakiness routing). Then copy both to plugin mirrors.
- **Rationale**: All 4 changes to test-agent.md are sequential additions to its existing step flow. The implementation-agent change is a small addition to one step. A single code-agent can handle this coherently without file overlap issues.

## Implementation Notes

### test-agent.md changes

**New Step 0a: Backend-Only Exclusion** (insert between Step 0 and Step 0b):
```
After reading the project profile in Step 0, check the Tech Stack table for a "UI Layer" row.
- If value is "none" (case-insensitive, trimmed): log and skip ALL E2E sections. Proceed to unit test flow only.
- If missing or any other value: proceed normally (backward compatible).
```

**Modify Step 0b: Playwright / E2E Detection**:
Add a guard at the top: "If backend-only exclusion is active (Step 0a), skip this entire section."

**New Step 2.5: Dev Server Management** (insert between Step 2 and Step 3):
```
Before running Playwright tests:
1. Read playwright.config.* for a `webServer` property. If found, log and skip server management.
2. If no webServer: read project profile for Dev Server start command. If found, use it.
3. If neither: try `npm run dev` (or pnpm/yarn equivalent based on detected package manager).
4. Start the command as a background process.
5. Poll the expected port (from Playwright baseURL or default 3000) with HTTP GET every 1 second, up to 30 seconds.
6. If port responds: proceed with tests.
7. If timeout: log failure, skip E2E tests, proceed with unit tests only.
After ALL Playwright tests complete (including retries): kill the background server process.
```

**Modify Step 3: Run Tests -- Playwright section**:
Replace `npx playwright test {path}` with `npx playwright test --retries=2 {path}`. Add note that Playwright's built-in retry mechanism handles per-test retries and reports results with retry metadata.

**Modify Step 4: Results Format**:
Add `flaky-e2e` as a third test type alongside `unit` and `e2e`. Add `flakyE2E` boolean to the summary metadata. Add example:
```
#### Scenario 8: FLAKY
- Behavior: {what went wrong, described generically}
- Type: flaky-e2e
- Attempts: Attempt 1: FAIL, Attempt 2: FAIL, Attempt 3: PASS
```

### implementation-agent.md changes

**Modify Feature Mode Step 3: Evaluate**:
After reading results, check for `flakyE2E: true` in the results metadata. If found:
- Separate flaky scenarios from clean failures.
- For clean failures: proceed with normal code-agent re-run (existing behavior).
- For flaky scenarios: do NOT re-spawn code-agent. Instead, spawn spec-agent with bugfix mode, passing the flaky scenario details and the original spec context. Log the routing decision.
- If ALL failures are flaky (no clean failures): skip code-agent re-run entirely. Only spawn spec-agent for bugfix.
- If mix of flaky and clean failures: spawn code-agent for clean failures AND spec-agent for flaky ones in parallel.

### Files to modify
- `.claude/agents/test-agent.md` -- primary changes (4 additions/modifications)
- `.claude/agents/implementation-agent.md` -- one addition to Step 3 Evaluate
- `plugins/dark-factory/agents/test-agent.md` -- exact mirror of test-agent.md
- `plugins/dark-factory/agents/implementation-agent.md` -- exact mirror of implementation-agent.md

### Patterns to follow
- Agent markdown uses `##` for major steps, `###` for sub-steps, and fenced code blocks for examples/templates
- New steps should follow the existing numbering convention (Step 0, Step 0b, Step 1, etc.)
- Constraints and rules use bullet points with bold keywords
- Logging messages use `>` blockquote format in agent markdown
- The contracts test suite (`tests/dark-factory-contracts.test.js`) enforces plugin mirror parity -- after writing both copies, run `node --test tests/dark-factory-contracts.test.js` to verify

## Traceability
| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 | P-01, H-01, H-02, H-03 |
| FR-2 | P-02, P-03, H-04, H-05, H-06, H-07 |
| FR-3 | P-04, H-08 |
| FR-4 | P-05, H-09 |
| FR-5 | P-05, H-09 |
| FR-6 | P-06, H-10, H-11 |
| FR-7 | P-07 |
| BR-1 | P-01, H-01 |
| BR-2 | P-02, H-04 |
| BR-3 | P-04, H-08 |
| BR-4 | P-06, H-10, H-11 |
| BR-5 | P-03, H-06 |
| BR-6 | P-05 |
| EC-1 | H-01 |
| EC-2 | H-02 |
| EC-3 | H-03 |
| EC-4 | H-05 |
| EC-5 | H-07 |
| EC-6 | P-07 |
| EC-7 | H-08 |
| EC-8 | H-11 |
| EC-9 | H-12 |
| EC-10 | H-13 |
| EC-11 | H-06 |
