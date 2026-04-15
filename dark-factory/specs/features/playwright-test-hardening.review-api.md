## Domain Review: API Design & Backward Compatibility
### Feature: playwright-test-hardening
### Status: APPROVED WITH NOTES
### Reviewer Domain: API Design & Backward Compatibility (contracts, versioning, error handling, observability)

---

### Findings

#### Blockers
None.

#### Concerns

**C-1: New inter-agent contract (`flaky-e2e` type + `flakyE2E` flag) has no schema or validation spec**
The spec introduces a new contract between test-agent and implementation-agent: the `flaky-e2e` test type and `flakyE2E: true` metadata flag. This is the first time a results format change triggers fundamentally different routing behavior (spec-agent spawn instead of code-agent re-run). The spec defines the contract implicitly through prose (FR-5, FR-6) but does not specify:
- What happens if implementation-agent reads results that contain an unknown test type (forward compatibility).
- Whether `flakyE2E` is the sole signal or if the implementation-agent should also check for `type: "flaky-e2e"` entries — the spec uses both but doesn't clarify which is authoritative.

**Recommendation**: Clarify that `flakyE2E: true` in summary metadata is the single authoritative signal for flakiness routing. The per-scenario `type: "flaky-e2e"` is informational for reporting. This prevents ambiguity if only one is present due to a bug.

**C-2: Dev server detection cascade lacks observability for debugging**
FR-2 defines a 3-step detection cascade (Playwright webServer → project profile → npm run dev fallback). Each step has logging, which is good. However, the spec doesn't specify whether the final chosen method is recorded in the results output. If E2E tests later fail, a developer debugging the pipeline has no way to know which server management path was taken without re-reading agent logs.

**Recommendation**: Include a `devServerSource` field (e.g., `"playwright-config"`, `"project-profile"`, `"fallback-npm"`, `"skipped"`) in the results metadata. Low-cost addition, high debugging value.

#### Suggestions

**S-1: Consider forward compatibility for the retry count**
FR-3 hardcodes `--retries=2`. The spec correctly notes this is configurable, but the configuration mechanism is "change the agent markdown." If a future spec needs to make this project-configurable (e.g., via project profile), the current design would require modifying the agent markdown text. This is fine for now, but worth noting that a `E2E Retries` field in the project profile would be the natural extension point — no action needed in this spec.

**S-2: Error table row for "port already in use" is pragmatic but worth documenting the assumption**
EC-11 / error table row "Dev server port already in use — assume server is already running" is a reasonable heuristic. However, it assumes the process on that port is actually the correct dev server and not an orphaned process from a previous run. The spec handles this acceptably (tests will fail if it's the wrong process, triggering retries), but the assumption should be explicit in the agent markdown so future maintainers understand the trade-off.

**S-3: `UI Layer` field contract with project profile is soft-coupled by design — this is correct**
The graceful degradation when `UI Layer` is missing (EC-1, EC-2) is the right backward compatibility approach. The dependency on `playwright-onboard` is soft: the feature works without it, just without the optimization. This is a good contract pattern for agent-to-agent data dependencies.

---

### Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D-1 | `flakyE2E: true` metadata flag should be the authoritative routing signal | Prevents ambiguity between summary-level flag and per-scenario type field |
| D-2 | Results format is additive (new type `flaky-e2e` alongside existing `unit` and `e2e`) | Backward compatible — consumers that don't know `flaky-e2e` simply see an unfamiliar type, no parsing errors |
| D-3 | Missing `UI Layer` field defaults to existing behavior, not to error | Correct soft-dependency pattern — the feature degrades gracefully without `playwright-onboard` |
| D-4 | Playwright's built-in `--retries` flag used instead of custom retry wrapper | Leverages existing contract, avoids reinventing retry semantics, results format comes from Playwright itself |
| D-5 | Dev server management defers to Playwright `webServer` config when present | Respects existing Playwright contract, avoids double-start port conflicts (BR-2) |

---

### Summary

The spec's backward compatibility story is strong. All new behavior is additive, and missing data triggers graceful fallbacks rather than errors. The main concern is clarifying which signal (`flakyE2E` flag vs `flaky-e2e` type) is authoritative for routing decisions — this matters because the two are produced independently and could theoretically diverge. The dev server observability suggestion (C-2) would add meaningful debugging capability at negligible cost. No blockers.
