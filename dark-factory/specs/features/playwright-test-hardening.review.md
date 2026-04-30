## Architect Review: playwright-test-hardening

### Rounds: 1 (Tier 3 parallel domain review)

### Status: APPROVED

### Synthesis
All three domain reviewers returned APPROVED. Strictest-wins: overall APPROVED. No blockers or concerns requiring spec changes. No contradictions between domain reviewers.

### Key Decisions Made
- **Backend-only exclusion gate (Step 0a before Step 0b)**: Absolute skip of all E2E logic when UI Layer is "none" (case-insensitive). Backward-compatible: missing field proceeds normally. Rationale: avoids wasted cycles on projects with no UI layer.
- **Dev server detection cascade (playwright.config → project profile → npm run dev fallback)**: Fail-soft cascade with 30s timeout. On timeout, skips E2E and proceeds with unit tests only. Rationale: never block the pipeline; E2E is best-effort when infrastructure is uncertain.
- **flakyE2E as single authoritative signal**: One boolean in results metadata drives routing. Prevents split-brain behavior where multiple fields could conflict. Rationale: simplicity and predictability for the implementation-agent's routing logic.
- **Additive results format changes**: New `flaky-e2e` type and `flakyE2E` field are additive — existing `unit` and `e2e` types unchanged. Old consumers unaffected. Rationale: backward compatibility.
- **Inline logic in agent markdown, no dedicated e2e-runner-agent**: Right-sized for current scope. Extraction path is explicitly documented for future scaling. Rationale: YAGNI for current pipeline usage.
- **Process group kill for dev server cleanup (BR-5)**: Mandatory regardless of test outcome. Prevents orphaned processes from breaking subsequent runs. Rationale: operational correctness.

### Remaining Notes
- The `kill -- -$PID` pattern for server cleanup is Unix-specific. Acceptable for current developer tooling use case (macOS/Linux primary). Windows compatibility is a future concern if needed.
- The flakiness routing spawns a spec-agent in bugfix mode for flaky tests. Future consumers (promote-agent, etc.) should be aware of the new `flaky-e2e` type if they ever parse the results format.
- The spec adds `devServerSource` to the results metadata as a new enum-valued field. Well-defined and backward-compatible.
