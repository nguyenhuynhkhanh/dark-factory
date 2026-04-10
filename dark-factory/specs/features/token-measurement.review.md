## Architect Review: token-measurement

### Rounds: 1 (parallel domain review)

### Status: APPROVED WITH NOTES

### Key Decisions Made

1. **Single code-agent track is correct**: All 3 file mirrors (`.claude/agents/implementation-agent.md`, `plugins/dark-factory/agents/implementation-agent.md`, `scripts/init-dark-factory.js`) are tightly coupled — parallel tracks would risk divergence. The spec's 1-track recommendation is validated.

2. **Implementation-agent as sole accumulation point**: Accumulating token counts inside the implementation-agent (not the orchestrator or skill layer) is architecturally sound — it is the only agent with full visibility across all sub-agent results for one spec's lifecycle. This is documented in BR-1 and confirmed correct.

3. **Append-only JSONL write pattern**: Using `jq -cn ... >> ~/.df-factory/token-history.jsonl` (not read-modify-write) is the correct and safe pattern for concurrent safety. No file-locking needed as long as the append is a single write syscall.

4. **`--argjson` for all numeric fields (NFR-4)**: Critical correctness requirement. `totalTokens`, `agentTokens.*`, `durationMs`, `roundCount`, `groupTotalTokens` must all use `--argjson` not `--arg`. This prevents string coercion that would break downstream arithmetic.

5. **Additive-only event payload extension**: No existing `log_df_outcome` fields are renamed or removed — only new fields added. This is backward-compatible with any existing server consumers. The conditional field presence pattern (absent vs. null) for `baselineTag` and `groupTotalTokens` is correct but requires defensive conditional inclusion in the jq expression.

6. **Local JSONL before server sync**: The local `token-history.jsonl` write must be independent of server availability. The ordering must be: server call (fire-and-forget) → read local file for baseline → compute delta → display → append local file. Server failure must never gate local write.

### Remaining Notes

1. **df-orchestrate skill needs `--tag` parsing** (API domain concern): FR-10 lists 3 mirror files but the `--tag <name>` CLI argument must also be parsed in `.claude/skills/df-orchestrate/SKILL.md` and forwarded to the implementation-agent. Without this, the `--tag` feature has no entry point. The code-agent must also update the df-orchestrate skill file. This is an omission in the spec's file list but the feature description makes the intent clear.

2. **token-history.jsonl pre-filtering**: The comparison logic should use streaming line-by-line reads with grep pre-filtering by `featureName` rather than loading the entire file into memory (EC-5). Use `grep '"featureName":"$SPEC_NAME"' ~/.df-factory/token-history.jsonl` to pre-filter before jq parsing.

3. **Cross-platform specHash**: The implementation must include macOS/Linux fallback as documented in Implementation Notes: try `shasum -a 256` first, fall back to `sha256sum`.

4. **Conditional jq fields**: `baselineTag` and `groupTotalTokens` must use shell `if` guards for conditional inclusion in the jq expression — not always-included with null values.

5. **groupTotalTokens benign race**: Two specs completing nearly simultaneously could both write `groupTotalTokens`. Since both would compute the identical correct sum, this is a benign data duplication (not a correctness issue). Acceptable for current scope.

6. **tag value safety**: `--tag` values must be passed to jq as `--arg` string parameters (not shell-interpolated into the filter expression) to prevent injection. This is implied by the spec's "Bash quoting" note.
