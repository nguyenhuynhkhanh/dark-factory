# Scenario: H-08 — Profile file open in another process does not cause data loss

## Type
edge-case

## Priority
low — unlikely in practice but important for correctness; appending to a file that is simultaneously open should not truncate it

## Preconditions
- `~/.zshrc` exists with some existing content (e.g., aliases, exports)
- A separate process has `~/.zshrc` open for reading (simulated by a background `tail -f ~/.zshrc &`)
- `$SHELL` is `/bin/zsh`
- `~/.df-factory/bin/` does not exist

## Action
With the background read process running, execute:
```bash
curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh | bash
```

## Expected Outcome
- `~/.zshrc` contains all its original content PLUS the appended PATH line
- No existing content in `~/.zshrc` is lost or truncated
- The file is valid and sourceable after the install

## Failure Mode
If existing content is lost, the implementation used a write-then-replace strategy (e.g., writing to a temp file and `mv`-ing it over). The spec requires `>>` append, which does not truncate.

## Notes
This covers EC-4. The `>>` operator never truncates. This scenario guards against an implementation that reads the file, modifies it in memory, and writes it back — which would truncate on concurrent access.
