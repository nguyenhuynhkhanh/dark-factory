## Domain Review: Architecture & Performance

### Feature: playwright-test-hardening
### Status: APPROVED

### Code Reality
The feature modifies `.claude/agents/test-agent.md` and `.claude/agents/implementation-agent.md`, with exact mirrors required in `plugins/dark-factory/agents/`. The spec correctly identifies the dual-write requirement and the contracts test suite enforces mirror parity.

Existing ADRs relevant to this review:
- ARCH-001: UI and E2E detection uses file reads only — no exec/install commands. This spec's dev server management step DOES run external commands (npm run dev, etc.) — but this is at test-time execution, not onboard-agent detection time. Not a violation.
- ARCH-003: E2E Ready requires both a dependency entry AND a config file. This spec builds on the E2E infrastructure — compatible.

### Findings

**Blockers**: None.

**Concerns**:
- The dev server management cascade (playwright.config → project profile → npm run dev fallback) is defined as text instructions in the agent markdown. Since agents interpret these as prose instructions, the actual behavior depends on the LLM following the cascade precisely. This is inherent to the framework and acceptable — the spec provides clear, unambiguous instructions.
- Step 2.5 (Dev Server Management) is inserted between Step 2 (Write Tests) and Step 3 (Run Tests). The ordering is correct: write tests first, then ensure server is running, then run tests. This matches the intent.

**Suggestions**:
- The spec's Implementation Notes describe Step 2.5 as "New Step 2.5: Dev Server Management" inserted between Step 2 and Step 3. The test-agent.md already has this structure. Verified consistent with current implementation.
- The flakiness routing in implementation-agent.md places the `flakyE2E: true` check between reading results and the normal pass/fail evaluation. The `flakyE2E` boolean as the authoritative signal is the right pattern — single source of truth for routing decision.
- The plugin mirror pattern (dual-write) is well-established in this codebase. The spec correctly calls it out. The contracts test suite enforces it.

### Key Decisions
- Inline logic in agent markdown vs. dedicated "e2e-runner-agent": spec explicitly defers extraction to future. This is the correct right-sizing for current scope. APPROVED.
- `flakyE2E` as single authoritative routing signal: prevents split-brain routing where multiple fields could conflict. APPROVED.
- Step 0a (backend-only exclusion) before Step 0b (detection): correct guard placement. Step 0b explicitly skips when backend-only exclusion active. APPROVED.

### Intent & Drift Check — Architecture & Performance
DI shard `design-intent-architecture.md` is empty (bootstrapped). No active entries to check for erosion/bypass. No BLOCKER.

ARCH-001 (file reads only for detection): this spec adds execution-time server management in test-agent, not detection-time. No drift.
ARCH-002 (exact package-name allowlist): not affected by this spec.
ARCH-003 (E2E Ready signal): not modified by this spec.

### Memory Findings (architecture)
- Preserved: ARCH-001, ARCH-002, ARCH-003 (all unaffected)
- Modified (declared in spec): None
- Potentially violated (BLOCKER): None
- New candidates declared: None
- Orphaned (SUGGESTION only): None
