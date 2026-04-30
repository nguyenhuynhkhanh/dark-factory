## INFRA-001: Backend-only exclusion gate is absolute for UI Layer none

- **Status**: active
- **Superseded-by**: N/A
- **Domain**: infra
- **Layer**: 2
- **Statement**: When the project profile Tech Stack table has UI Layer = "none" (case-insensitive), the test-agent skips ALL E2E logic with no fallback, no prompt, and no override.
- **Rationale**: Backend-only projects have no UI layer to test; attempting E2E detection wastes cycles and can produce false positives or negatives. The exclusion must be unconditional to prevent accidental E2E runs.
- **Impact**: test-agent Step 0a; any future E2E detection steps added to test-agent must respect this gate.
- **Effective**: 2026-04-30

## INFRA-002: Dev server detection uses fail-soft cascade with 30s timeout

- **Status**: active
- **Superseded-by**: N/A
- **Domain**: infra
- **Layer**: 2
- **Statement**: The test-agent detects and starts a dev server using a 3-step cascade (playwright.config webServer → project profile Dev Server command → npm run dev fallback). On timeout (30s), E2E tests are skipped and unit tests proceed — the pipeline is never blocked by server startup failure.
- **Rationale**: E2E infrastructure varies widely across projects. A hard failure on missing server setup would break the pipeline for projects that simply haven't configured dev server management yet. Fail-soft preserves unit test validation in all cases.
- **Impact**: test-agent Step 2.5; onboard-agent's Dev Server field in project profile (if populated, it is consumed here).
- **Effective**: 2026-04-30

## INFRA-003: flakyE2E boolean is the single authoritative routing signal for flakiness

- **Status**: active
- **Superseded-by**: N/A
- **Domain**: testing
- **Layer**: 2
- **Statement**: The `flakyE2E` boolean in the test results summary metadata is the ONLY signal the implementation-agent uses to determine flakiness routing. No other field (scenario type counts, attempt breakdowns, etc.) is used for routing decisions.
- **Rationale**: Single source of truth prevents split-brain routing where multiple fields could disagree. The test-agent sets this flag deterministically based on its retry results.
- **Impact**: test-agent Step 4 results format; implementation-agent Step 3 Evaluate (Flaky E2E Routing section).
- **Effective**: 2026-04-30

## INFRA-004: Retry mechanism is E2E-only, never applied to unit tests

- **Status**: active
- **Superseded-by**: N/A
- **Domain**: testing
- **Layer**: 2
- **Statement**: Playwright --retries=2 flag is applied exclusively to E2E tests. Unit tests are never retried. Flaky unit tests are treated as code problems requiring code-agent attention.
- **Rationale**: Unit tests are deterministic by design; retry on unit test failure masks real code bugs. E2E tests are subject to infrastructure non-determinism (timing, server state, network) that warrants retry-before-classify.
- **Impact**: test-agent Step 3 Run Tests; implementation-agent Flaky E2E Routing (flaky scenarios do not count toward 3-round retry max for code-agent re-runs).
- **Effective**: 2026-04-30
