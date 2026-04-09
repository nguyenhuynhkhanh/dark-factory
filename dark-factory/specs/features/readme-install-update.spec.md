# Feature: readme-install-update

## Context

Commit `7479a3d` changed the CLI install location from `~/.local/bin` to `~/.df-factory/bin`, but `README.md` was never updated. As a result, the README documents the wrong install path, does not explain that PATH must be configured, and does not provide an uninstall procedure. Developers following the README will install correctly (the install script is right) but then be confused when `df-onboard.sh` is not found.

Additionally, `install.sh` does not modify the user's PATH — the developer must do this manually, which is an unnecessary friction point and a source of support overhead.

This spec covers both the README correction and the `install.sh` PATH automation.

## Scope

### In Scope (this spec)
- `README.md` — rewrite the installation section to match the current install path (`~/.df-factory/bin`), add prerequisites, document PATH setup, add upgrade and uninstall instructions, and cover the security note about curl-pipe-bash
- `cli-lib/install.sh` — append `export PATH="$HOME/.df-factory/bin:$PATH"` to the user's shell profile after installing, detect the shell via `$SHELL`, and make the operation idempotent

### Out of Scope (explicitly deferred)
- Removing the `jq` dependency from `df-onboard.sh` and other scripts (tracked in a separate spec)
- Windows or PowerShell support
- System-wide installs (e.g., `/usr/local/bin`) — this is a per-user tool
- Fish shell or other non-bash/zsh shells
- Any changes to `df-onboard.sh`, `df-check-onboard.sh`, or `log-event.sh`

### Scaling Path
If the CLI grows to a published package, `install.sh` can be replaced with a `brew` formula or a proper installer. The current approach (curl-pipe-bash + shell profile injection) is appropriate for a small developer-tools project with a handful of installs.

## Requirements

### Functional

- FR-1: `install.sh` must detect the user's shell by inspecting `$SHELL` — if it contains `zsh`, target `~/.zshrc`; if it contains `bash`, target `~/.bashrc`; otherwise fall back to `~/.bashrc` — rationale: macOS defaults to zsh; Linux typically uses bash; both must be covered without requiring user input
- FR-2: After all scripts are installed, `install.sh` must append `export PATH="$HOME/.df-factory/bin:$PATH"` to the detected shell profile file — rationale: removes the manual PATH step that currently causes "command not found" after install
- FR-3: The PATH append must be idempotent — if the exact line already exists in the profile, do not append a duplicate — rationale: re-running the install command is the documented upgrade path; appending on every run would corrupt the profile
- FR-4: `install.sh` must print a message after PATH setup instructing the user to `source` their profile or restart their terminal — rationale: the PATH change is not effective in the current shell session without this step
- FR-5: `README.md` must replace every reference to `~/.local/bin` with `~/.df-factory/bin` — rationale: the old path is factually incorrect and will confuse developers trying to verify the install
- FR-6: `README.md` must document both the full path invocation (`~/.df-factory/bin/df-onboard.sh`) and the bare invocation (`df-onboard.sh`) for the post-install step, with a note that the bare form works after sourcing the profile — rationale: developers who have not yet sourced their profile need the full path; those who have sourced it can use the shorter form
- FR-7: `README.md` must include a prerequisites section listing `curl` as required and explicitly stating `jq` is NOT required — rationale: the old README implied jq was needed; the scripts have jq-free fallback paths
- FR-8: `README.md` must include an uninstall section with a one-liner that removes `~/.df-factory/` and describes the shell profile cleanup step — rationale: no uninstall path was previously documented
- FR-9: `README.md` must include an upgrade note — re-run the install command — rationale: the install script is idempotent and this should be explicit
- FR-10: `README.md` must include a security note acknowledging the curl-pipe-bash pattern and linking to the raw script URL so security-conscious users can review it before running — rationale: this is a known trust concern with this install method

### Non-Functional

- NFR-1: The shell profile modification in `install.sh` must not leave partial writes if the script is interrupted — rationale: a truncated profile file would break the user's shell
- NFR-2: `install.sh` must remain POSIX-compatible (`#!/usr/bin/env bash` is acceptable; no bashisms that don't run on macOS default bash 3.2) — rationale: some users may have older macOS systems before zsh became default
- NFR-3: The README must remain accurate after the jq-removal spec lands — the prerequisite section must not introduce a dependency on jq, since it is explicitly being removed — rationale: coordinated with jq-removal spec

## Data Model

N/A — this feature modifies no database schema, API, or data store.

## Migration & Deployment

N/A — no existing data affected. This project has no existing user base. The README and install script changes are safe to deploy at any time. No database migrations, cache invalidation, or rollback procedures are required.

The old `~/.local/bin` install path is not in use — the codebase never completed a production release with that path. There are no existing installs to migrate.

## API Endpoints

N/A — this feature modifies no API endpoints.

## Business Rules

- BR-1: The idempotency check for PATH injection must use a literal string match against the exact export line — not a fuzzy match on `df-factory` — rationale: fuzzy matching could suppress a legitimate re-add if the user manually edited the profile in a way that contains `df-factory` in a different context
- BR-2: Shell profile detection must use `$SHELL`, not shebang or `ps` inspection — rationale: `$SHELL` is the user's login shell; inspecting the currently running process would give the shell running the pipe (which is always bash when using `bash` in the curl command), not the user's default shell
- BR-3: The PATH line must use `$HOME` (not the literal tilde `~`) in the exported line written to the profile — rationale: `~` is not always expanded by all shells in all contexts; `$HOME` is portable
- BR-4: The fallback for unknown shells must be `~/.bashrc`, not silent failure — rationale: failing silently would leave the user with no PATH configured and no explanation

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| `$SHELL` is unset or empty | Fall back to `~/.bashrc`; print a warning noting which file was used | Profile written to `~/.bashrc`; user is informed |
| Shell profile file does not exist yet | Create it with the PATH line (via append, which creates the file) | File is created; idempotency check will find it on next run |
| PATH line already exists in profile | Skip the append; print "PATH already configured" | No change to profile |
| curl fails to download a script during install | `set -e` exits the script; partially installed scripts remain; user is shown curl's error | User must re-run; no cleanup of partial downloads needed — re-run is idempotent |

## Acceptance Criteria

- [ ] AC-1: Running `install.sh` on a clean machine with zsh sets `SHELL=/bin/zsh` and appends the PATH line to `~/.zshrc` exactly once
- [ ] AC-2: Running `install.sh` twice on the same machine does not produce duplicate PATH lines in the shell profile
- [ ] AC-3: Running `install.sh` on a machine with `SHELL=/bin/bash` appends the PATH line to `~/.bashrc`
- [ ] AC-4: After running `install.sh` and sourcing the profile, `which df-onboard.sh` resolves to `~/.df-factory/bin/df-onboard.sh`
- [ ] AC-5: `README.md` contains no references to `~/.local/bin`
- [ ] AC-6: `README.md` contains the raw script URL for manual review (security note)
- [ ] AC-7: `README.md` documents both the full path and bare invocation for `df-onboard.sh`
- [ ] AC-8: `README.md` contains an uninstall section
- [ ] AC-9: `README.md` contains a prerequisites section that lists `curl` and explicitly states `jq` is not required
- [ ] AC-10: `install.sh` prints a message after PATH setup instructing the user to source their profile

## Edge Cases

- EC-1: `$SHELL` is set to a non-bash/zsh value (e.g., `/bin/fish`, `/bin/sh`) — fall back to `~/.bashrc` and print a warning naming the file used
- EC-2: `~/.zshrc` (or `~/.bashrc`) does not exist — the append creates the file; subsequent runs are still idempotent
- EC-3: The PATH line exists in the profile but with `~` instead of `$HOME` (manually added by user) — the idempotency check looks for the exact `$HOME` form; it will not find the `~` form and will append the `$HOME` version — this results in two PATH entries for the same directory, which is harmless but not ideal. Spec accepts this as a known limitation because enforcing all forms would require regex matching with higher risk of false positives.
- EC-4: The user runs the install command while their shell profile is open in an editor — the append is a single atomic `>>` write; the file is not truncated; no data loss occurs
- EC-5: `install.sh` is run as root — `$HOME` resolves to `/root`; the PATH line goes to `/root/.bashrc` or `/root/.zshrc`; this is unusual but not incorrect; no special handling needed
- EC-6: The curl-pipe-bash invocation runs the install script under `bash` even when `$SHELL` is `zsh` — the script must read `$SHELL` from the environment (set by the login shell session), not from the currently executing process, so it correctly detects zsh
- EC-7: `install.sh` is downloaded and run directly (not via pipe) — behavior is identical; `$SHELL` is still available from the environment

## Dependencies

None — this spec is independently implementable.

## Implementation Size Estimate

- **Scope size**: small (2 files)
- **Suggested parallel tracks**: 1 code-agent implements both `README.md` and `cli-lib/install.sh`; there is no benefit to parallelising 2-file work across multiple agents

## Implementation Notes

Current `install.sh` ends with:
```bash
echo ""
echo "Done. Run '~/.df-factory/bin/df-onboard.sh' to get started."
```

The PATH injection block must be inserted before this final message, so the message can reference both the full path and the bare name.

Pattern to check for existing PATH line and conditionally append:
```bash
PROFILE_LINE='export PATH="$HOME/.df-factory/bin:$PATH"'
if ! grep -qF "$PROFILE_LINE" "$PROFILE_FILE" 2>/dev/null; then
  printf '\n%s\n' "$PROFILE_LINE" >> "$PROFILE_FILE"
fi
```

Using `grep -qF` (fixed-string, quiet) avoids regex escaping issues with the `$` characters in the line. The `2>/dev/null` handles the case where the profile file does not yet exist.

The README currently has a "Developer CLI" section at line 17. The entire content of that section (and any sub-sections) should be replaced, not just individual lines. The rest of the README (Stack, Running locally, Deploying, Running tests) is accurate and should be left unchanged.

Raw script URL for the security note:
`https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh`

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 (shell detection zsh) | P-01, H-02 |
| FR-1 (shell detection bash) | P-02 |
| FR-1 (shell detection fallback) | H-01 |
| FR-2 (PATH append) | P-01, P-02 |
| FR-3 (idempotent) | P-03, H-03 |
| FR-4 (source message) | P-01, P-02 |
| FR-5 (README path fix) | P-04 |
| FR-6 (dual invocation docs) | P-05 |
| FR-7 (prerequisites) | P-06 |
| FR-8 (uninstall) | P-07 |
| FR-9 (upgrade note) | P-08 |
| FR-10 (security note) | P-09 |
| BR-1 (literal match) | H-03 |
| BR-2 ($SHELL source) | H-04 |
| BR-3 ($HOME not tilde) | H-05 |
| BR-4 (fallback not silent) | H-01 |
| EC-1 (unknown shell) | H-01 |
| EC-2 (profile does not exist) | H-06 |
| EC-3 (tilde vs $HOME coexistence) | H-07 |
| EC-4 (profile open in editor) | H-08 |
| EC-5 (run as root) | H-09 |
| EC-6 (bash pipe, zsh login) | H-04 |
| EC-7 (run directly) | H-10 |
| Error: $SHELL unset | H-01 |
| Error: profile does not exist | H-06 |
| Error: PATH already present | P-03, H-03 |
