## Domain Review: API Design & Backward Compatibility

### Feature: token-measurement
### Status: APPROVED WITH NOTES

### Findings

**Blockers**: None

**Concerns**:

1. **log_df_outcome additive extension — field presence semantics**: The spec states `baselineTag` is "only present when `--tag <name>` is passed; absent (not null) when no tag" and `groupTotalTokens` is "only present when the spec belongs to a group; absent when ungrouped." This conditional field presence pattern is correct for additive extension but requires care in the jq construction. The implementation must conditionally include these fields via `if` guards in the jq expression rather than always including them with null values. NFR-4 already mandates `--argjson` for numeric fields. The code-agent must be explicitly instructed that `baselineTag` and `groupTotalTokens` should use conditional inclusion (`if [ -n "$BASELINE_TAG" ]` guard) not just null-value inclusion.

2. **Backward compatibility of existing log_df_outcome consumers**: The spec correctly states existing servers will "ignore unknown fields." This is only safe if the server (if configured) is using a schema that ignores additional properties — which is standard for JSON-based event logs. Since the spec describes the server as unspecified/optional, this assumption is reasonable and documented.

3. **token-history.jsonl as a "contract"**: The JSONL file is a local storage format used by the same implementation-agent that writes it. Since the reader and writer are the same code (in the same agent update), there's no external consumer that could break. Backward compatibility for this file is N/A for the current spec. However, EC-5 notes the file could "grow to thousands of entries" — the spec should acknowledge that future schema changes to the JSONL format would require migration logic (deferred, acceptable for current scope).

4. **Display format as an implicit contract**: The `=== Token Usage ===` block format is a user-facing contract. If future specs want to parse this output programmatically (e.g., for CI validation), the format must be stable. The spec defines the exact format in the Display Format section — this is good. No change needed, but worth noting the format should not change lightly in the future.

5. **`--tag` as a new CLI argument**: The spec adds `--tag <name>` to `df-orchestrate`. The spec mentions this is a new argument to `df-orchestrate` (the skill). The df-orchestrate skill must be updated to parse and forward this argument to the implementation-agent. The spec mentions this but doesn't explicitly call out the df-orchestrate skill change — the implementation must include updating `.claude/skills/df-orchestrate/SKILL.md` to document the new `--tag` argument and forward it. This may be an omission in the files listed under FR-10.

   **This is a notable omission**: FR-10 lists only 3 mirror files but the `--tag` argument needs to be parsed at the `df-orchestrate` skill level and forwarded to the implementation-agent. If the skill doesn't parse `--tag`, the feature doesn't work end-to-end. The spec should either add the df-orchestrate skill file to the list of files to be updated, or explicitly describe how `--tag` flows from the CLI to the implementation-agent.

6. **Observability of the token feature itself**: The implementation-agent now has more responsibilities. If token extraction silently fails (NFR-1), the display block will show zeros — which is currently ambiguous between "no sub-agents executed" and "extraction failed." The warning "No usage block found for [phase] agent" is specified but may be easy to miss. This is acceptable given the explicit warning requirement.

**Suggestions**:

- Add `df-orchestrate` skill file (`.claude/skills/df-orchestrate/SKILL.md`) to the list of files requiring update in FR-10 or the Implementation Notes. Without it, `--tag` cannot be parsed from the CLI.

- The `baselineTag` field being absent (not null) when no tag is provided may cause consumer code to need null-coalescing. Consider whether always-present with null value would be simpler. The current spec choice (absent) is more RESTful but requires defensive access patterns. Document this as an explicit design decision.

### Key Decisions
- **Additive-only schema extension**: Correct approach — no existing fields renamed or removed. All new fields are backward-compatible additions.
- **Conditional field presence for optional fields**: `baselineTag` and `groupTotalTokens` are absent (not null) when not applicable — this is the right contract for optional metadata in event payloads.
- **`--argjson` for numeric fields (NFR-4)**: Critical correctness requirement well-documented. Downstream arithmetic on the event log and token-history.jsonl depends on numbers being JSON numbers, not strings.
