## Domain Review: Security & Data Integrity

### Feature: adaptive-lead-count
### Status: APPROVED

### Findings

- **Blockers**: None

- **Concerns**:
  - C1: The `--leads` flag is parsed inline from raw developer text input. The spec correctly specifies rejection of invalid values (0, 2, non-integer), but does not specify what happens with injection-style inputs like `--leads=1; rm -rf` or `--leads=1 && malicious`. Since this is a prompt-engineering system (not an OS command), the risk is low — Claude processes this as text, not as a shell command. No action required, but worth noting.
  - C2: C4 (ambiguity marker: "or") is very broad — the spec acknowledges that "or" in normal English phrases like "create or update" counts as an ambiguity marker. This conservative bias is by design (NFR-2), but could lead to false-positive 3-lead selections. This is a product decision, not a security concern. Acceptable.

- **Suggestions**:
  - S1: The spec says code-map.md is read "if it exists." Clarify whether the SKILL.md should handle the case where code-map.md exists but is malformed or empty (currently defaults to conservative 3-lead, which is appropriate).
  - S2: Consider documenting that the `--leads` flag is positional-after-command and not a shell flag (no actual shell execution occurs). This prevents future maintainers from incorrectly treating it as a security vector.

### Key Decisions

- Input validation via rejection (STOP with error) for invalid --leads values: The spec fully specifies this in Error Handling. No data is persisted, no injection vector exists. APPROVED.
- Conservative bias on missing/ambiguous data: Defaulting to 3 leads when code-map is absent is the correct defensive posture. No security gap.
- No persistent state introduced: The spec explicitly states Data Model N/A and no manifest schema changes. Zero data integrity risk.
- Plugin mirror atomicity (FR-9): Both files updated identically in same track — no drift window. Correct.
