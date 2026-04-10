## Domain Review: Architecture & Performance

### Feature: token-measurement
### Status: APPROVED WITH NOTES

### Findings

**Blockers**: None

**Concerns**:

1. **Mirror discipline complexity — highest fragility risk**: FR-10 requires 3 files to be updated atomically: `.claude/agents/implementation-agent.md`, `plugins/dark-factory/agents/implementation-agent.md`, and the generator function in `scripts/init-dark-factory.js`. The project profile explicitly calls this "the most fragile part" due to escaped backticks in template literals. The spec acknowledges this. The implementation-agent must ensure the code-agent is explicitly instructed to verify all three files are identical after changes — a post-edit diff check. This is flagged as a concern, not a blocker, because the spec documents it clearly and the acceptance criteria AC-10 covers it.

2. **token-history.jsonl read performance (EC-5)**: The spec states "performance optimization is deferred" for large files. The comparison logic reads all lines to find entries matching `featureName`. For the current user scale (personal/small team), this is acceptable. However, the implementation should use streaming line-by-line reads (e.g., `grep` or `awk` to pre-filter) rather than loading the full file into a shell variable, since files could grow to thousands of lines over time. The spec says "must not load entire file into memory if avoidable" — the implementation should follow this by using `grep "\"featureName\":\"$SPEC_NAME\"" ~/.df-factory/token-history.jsonl` to pre-filter before JSON parsing.

3. **specHash computation cross-platform**: The spec provides: `SPEC_HASH=$(shasum -a 256 "$SPEC_PATH" | cut -c1-7)` for macOS and `sha256sum` for Linux. The implementation must include both with proper fallback as stated. This is documented in the Implementation Notes — no change needed to the spec, but the code-agent must implement the fallback correctly.

4. **Phase attribution model**: Token accumulation uses "by the agent type spawned, not by time" — this is clean and correct. The implementation-agent wraps each sub-agent call and captures its result string, so phase attribution is deterministic. No performance concern here.

5. **groupTotalTokens last-writer determination**: BR-7 says the last spec to complete writes the group total. The mechanism ("first to check the group and find all others completed") is a polling/check pattern. In a single-machine parallel wave, multiple specs could complete near-simultaneously and both pass the "all others completed" check before either writes. The spec says this is determined by "wall-clock completion order" — but since completion check and write are not atomic, two specs could write `groupTotalTokens`. The result would be two correct values (both sums would be identical since they use the same completed set), so this is a data duplication concern, not a correctness concern. Worth noting but not a blocker.

6. **No circular dependency**: The spec explicitly states zero file overlap with other active specs (codemap-pipeline, adaptive-lead-count, serena-integration). The implementation touches only the implementation-agent files and test file. Clean isolation.

**Suggestions**:

- The Implementation Notes specify using `grep` or `awk` for line-by-line pre-filtering of `token-history.jsonl` by featureName before JSON parsing. Make this explicit in the implementation to avoid whole-file memory loading as the file grows.

- For the `groupTotalTokens` race (two specs completing nearly simultaneously): since both would write the same correct sum, this is benign. Document this as a known benign race in the spec's Edge Cases section or acknowledge it's acceptable.

- The display format uses Unicode characters (`─`, `✓`, `⚠`). Ensure these render correctly in Claude Code terminal output. If not, provide ASCII fallbacks.

### Key Decisions
- **Single code-agent track**: The spec's "1 code-agent track" recommendation is correct — all changes are tightly coupled (implementation-agent content must match across 3 files). Parallel tracks would risk divergence.
- **Implementation-agent as accumulation point**: The architectural decision (BR-1) to accumulate only inside the implementation-agent (not the orchestrator) is sound — it's the only agent with full sub-agent result visibility.
- **Local JSONL over server dependency**: The local fallback before server sync is the right architectural choice for a developer tool — it works offline and provides immediate value.
