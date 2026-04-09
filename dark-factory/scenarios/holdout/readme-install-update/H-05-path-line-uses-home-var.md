# Scenario: H-05 — PATH line written to profile uses $HOME, not a literal tilde

## Type
edge-case

## Priority
medium — a literal tilde in a profile line may not expand in all contexts (e.g., when the profile is sourced by a non-interactive shell, some scripts, or cron); $HOME is universally portable

## Preconditions
- Clean machine: `~/.df-factory/` does not exist
- `~/.zshrc` does not contain any df-factory reference
- `$SHELL` is `/bin/zsh`

## Action
Run the install command:
```bash
curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh | bash
```

## Expected Outcome
- The line appended to `~/.zshrc` is exactly:
  ```
  export PATH="$HOME/.df-factory/bin:$PATH"
  ```
- The line does NOT use `~/.df-factory/bin` (literal tilde form)
- The line does NOT use the expanded absolute path (e.g., `/Users/alice/.df-factory/bin`) — it must use the `$HOME` variable so it is user-portable in the profile

## Failure Mode
If the literal tilde form appears, the implementation has not followed BR-3.

## Notes
Check the raw bytes written to `~/.zshrc`. The grep can use: `grep 'export PATH="\$HOME/.df-factory/bin:\$PATH"' ~/.zshrc`
