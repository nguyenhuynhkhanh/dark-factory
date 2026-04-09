# Scenario: H-04 — curl-pipe-bash runs under bash but detects user's login shell as zsh

## Type
edge-case

## Priority
high — this is the most common deployment scenario on macOS; the curl-pipe-bash command always executes in bash regardless of the user's default shell, but $SHELL in the environment reflects the login shell

## Preconditions
- User's login shell is zsh (`$SHELL=/bin/zsh` set by the OS)
- `~/.zshrc` exists but does not contain any df-factory PATH line
- `~/.bashrc` exists but does not contain any df-factory PATH line

## Action
Run the exact documented install command (which pipes to `bash`, not to `zsh`):
```bash
curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh | bash
```

## Expected Outcome
- `~/.zshrc` receives the PATH export line (because `$SHELL` in the environment is `/bin/zsh`)
- `~/.bashrc` is NOT modified
- The fact that the script itself runs under bash (from the pipe) does NOT mislead the shell detection

## Failure Mode
If `~/.bashrc` is modified instead of `~/.zshrc`, the implementation is reading the running shell's process instead of `$SHELL`. This is the most common incorrect implementation of this feature.

## Notes
This validates BR-2 and EC-6. The implementation must read `$SHELL` from the environment variable, not from `$(ps -p $$ ...)` or any process-inspection method.
