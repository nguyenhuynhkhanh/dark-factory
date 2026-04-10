## Domain Review: API Design & Backward Compatibility

### Feature: codemap-pipeline
### Status: APPROVED WITH NOTES

### Findings

**Blockers**: None.

**Concerns**:

- **Map header schema is a new contract**: The `Git hash:` and `Coverage:` lines added to `dark-factory/code-map.md` are a new data contract between the pre-pipeline hook and the codemap-agent. The spec defines the format precisely:
  ```
  > Git hash: {full 40-character SHA-1}
  > Coverage: FULL | PARTIAL — {reason}
  ```
  The reading logic in the skills must parse these lines robustly — if the regex or string parsing is fragile (e.g., depends on trailing whitespace or line order), the pre-phase will fail. **Concern**: the spec should explicitly state the parsing rule (e.g., "extract the value after `> Git hash: ` as a trimmed string"). Not a blocker — easily addressed in implementation, but worth noting.

- **Backward compatibility for existing maps (EC-1)**: The spec explicitly handles the case where an existing map has no `Git hash:` line — treated as hash-mismatch, triggers full rescan. This is a clean migration path. No old code breaks (old code ignores the new header lines). **Well-handled**.

- **Rollback plan**: The spec states that if the feature is reverted, "the `Git hash:` header line is ignored by the old code." This is correct — old agents only read section content, not the header. No rollback migration needed. **Well-handled**.

- **Agent prompt contract**: The balanced search policy text is a behavioral contract — all 9 agents and 3 skills must contain the exact canonical phrase. The spec provides this canonical text and requires it be used verbatim (NFR-3). This is the correct approach for ensuring consistent behavior across independently spawned agents.

- **Error observability**: The spec defines two `COVERAGE: PARTIAL` flag values with specific messages:
  - `COVERAGE: PARTIAL — fan-in set truncated at 20 modules`
  - `COVERAGE: PARTIAL — scanner failure during refresh`
  These are user-visible messages that agents downstream will read. The messages are specific enough to be actionable. **Well-designed**.

- **`/df-onboard` contract unchanged**: The spec explicitly preserves the developer sign-off flow for `/df-onboard` invocations. The codemap-agent must distinguish between "called from onboard-agent (requires sign-off)" and "called from pre-pipeline hook (no sign-off)." The spec calls this out in EC-7 of the Implementation Notes. This distinction needs a clear invocation parameter (e.g., a `mode` argument passed to codemap-agent). The spec describes this behavioral distinction but doesn't define the exact invocation interface. **Minor concern** — the code-agent should define this explicitly when implementing codemap-agent.

**Suggestions**:

- The spec references "9 agents" in FR-6 but the original agent count in the project profile is 7 (spec, debug, onboard, architect, code, test, promote) + codemap-agent + implementation-agent = 9. The Track C list in Implementation Size Estimate only covers 6 (excluding codemap-agent and implementation-agent). This inconsistency could lead to the code-agent missing the balanced search policy update for codemap-agent itself (which arguably needs it) and/or implementation-agent. Recommend: during implementation, explicitly enumerate all 9 agents and verify each one gets the update.

### Key Decisions

- **Map header format is fixed**: `> Git hash: {40-char SHA-1}` and `> Coverage: FULL|PARTIAL — {reason}` are the canonical format. Parsing must be exact.
- **Backward compatibility is clean**: No old consumers break. Migration is automatic on first invocation.
- **Codemap-agent invocation mode parameter**: Must be defined explicitly (onboard-agent mode vs auto-refresh mode) to distinguish sign-off behavior.
