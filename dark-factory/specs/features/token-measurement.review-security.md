## Domain Review: Security & Data Integrity

### Feature: token-measurement
### Status: APPROVED WITH NOTES

### Findings

**Blockers**: None

**Concerns**:

1. **Concurrent write safety to token-history.jsonl**: NFR-2 states concurrent writes are "low-risk (each spec is a separate process)" but this is only safe because POSIX `>>` (append) for short writes is typically atomic on most OS. The spec should clarify that each appended JSON line must be written as a single `echo "..." >> file` or `jq -cn ... >> file` call — NOT as a read-modify-write pattern. The current Implementation Notes use `jq -cn ... >> ~/.df-factory/token-history.jsonl` which is correct. No change needed but it's worth being explicit that no file-lock is needed as long as the append is a single write syscall.

2. **Sensitive data in token-history.jsonl**: The JSONL file stores `featureName`, `specHash`, `tag`, and token counts. None of these contain secrets or PII. The spec correctly scopes this to aggregate counts only. No concern.

3. **Directory creation race**: The error handling table says "Create it before writing" for missing `~/.df-factory/` directory. In a parallel wave run, two specs could simultaneously check-and-create the directory. `mkdir -p` is idempotent and POSIX-safe — this is fine as-is. No change needed.

4. **Tag value injection**: EC-3 states `--tag` values with spaces/special characters must be stored as-is in JSON via `jq`. The spec mandates `jq -cn` for JSON construction which handles escaping correctly. However, the spec should explicitly state that `--tag` values are passed to jq as string arguments (not interpolated into the jq expression), which prevents injection. The Implementation Notes already say "Bash quoting in the jq call must handle this correctly" — acceptable.

5. **specHash as 7-char SHA-256 prefix**: Using only 7 characters of SHA-256 for content-addressing introduces a theoretical collision risk (~1 in 268M) but this is purely for human-readable comparison display, not for security. Acceptable for this use case.

**Suggestions**:

- Consider documenting that `token-history.jsonl` is a developer-local file (under `~/.df-factory/`) and should never be committed to git. A `.gitignore` entry in the `~/.df-factory/` directory structure might be warranted — though since the directory already exists from the logging infrastructure, this is likely already handled.

- The `partial: true` flag on blocked/failed runs is good data hygiene — it clearly marks incomplete entries and prevents them from being used as baselines. Well designed.

### Key Decisions
- **Append-only JSONL write**: Using `jq -cn ... >> file` (not read-modify-write) is the correct pattern for concurrent safety. This decision is already in the spec.
- **No secrets in token data**: The data model contains only aggregate counts and metadata — no user data, credentials, or sensitive pipeline details. Correct scoping.
- **Tag injection safety via jq**: Passing tag values as jq `--arg` string parameters (not shell-interpolated into the filter expression) prevents injection. The spec implies this via "Bash quoting" note.
