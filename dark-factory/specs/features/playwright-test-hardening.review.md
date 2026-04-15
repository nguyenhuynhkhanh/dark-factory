## Architect Review: playwright-test-hardening

### Rounds: 1 (parallel domain review)

### Status: APPROVED WITH NOTES

### Key Decisions Made
- **`flakyE2E: true` metadata flag is the authoritative routing signal**: The per-scenario `type: "flaky-e2e"` is informational for reporting, but the summary-level `flakyE2E` boolean drives implementation-agent routing decisions. (Source: API domain)
- **Use Playwright's native `--retries` flag instead of custom retry wrapper**: Avoids reimplementing retry logic. Playwright handles per-test retry, timeout, and reporting natively. (Source: Architecture domain)
- **Fail-soft cascade for dev server detection**: Three tiers (Playwright config -> profile -> fallback) with graceful degradation. No hard failure -- worst case skips E2E and runs unit tests. (Source: Architecture domain)
- **Flaky tests route to spec-agent, not code-agent**: Correct architectural choice. Flaky tests are an infrastructure/test problem, not a code problem. (Source: Architecture domain)
- **Dev server command execution gated by Bash tool permissions**: Claude Code's permission system gates execution. No bypass or interpolation of untrusted strings. (Source: Security domain)
- **Backend-only exclusion is absolute**: UI Layer "none" means zero E2E logic executes. Clean module boundary. (Source: Architecture domain)
- **Missing `UI Layer` field defaults to existing behavior**: Soft-dependency pattern -- degrades gracefully without playwright-onboard. (Source: API domain)
- **No security, data integrity, or concurrent write concerns**: All changes are to markdown definition files. No shared mutable state. (Source: Security domain)

### Remaining Notes
- **Dev server command in agent markdown should note Bash tool permission gate**: The dev server command from the project profile is passed to the Bash tool as-is. Do not wrap in `sh -c` or concatenate with other commands. (Source: Security C-1)
- **Playwright config parsing is pattern-matching, not AST**: Unusual config formats (programmatic, TypeScript with dynamic values) may not be detected. Fail-soft cascade mitigates this. (Source: Architecture C-1)
- **Port-in-use assumption is a known limitation**: The agent assumes a process on the expected port is the correct dev server. If it is not, tests will fail on their own merits. Document this trade-off in agent markdown. (Source: Security C-2, API S-2)
- **Consider adding `devServerSource` to results metadata**: Would aid debugging by recording which server management path was taken. Low cost, high value. (Source: API C-2)
- **Step numbering approaching readability limits**: Step 0 -> 0a -> 0b -> 1 -> 2 -> 2.5 -> 3 -> 4 is non-sequential. Future cleanup pass recommended. (Source: Architecture C-2)
- **30-second server timeout may be tight for large projects**: Could be made configurable via project profile in the future. Current fallback (skip E2E) is safe. (Source: Architecture S-3)
- **Consider process group kill for server cleanup**: `kill -- -$PID` would also clean up child processes. (Source: Architecture S-2)
