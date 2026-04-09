# Scenario: P-01 — Install on zsh machine adds PATH to ~/.zshrc

## Type
feature

## Priority
critical — this is the primary user journey on macOS; failure here means every macOS developer hits "command not found" after install

## Preconditions
- Clean machine: `~/.df-factory/` does not exist
- `~/.zshrc` exists but does not contain any reference to `df-factory`
- `$SHELL` is set to `/bin/zsh` (standard macOS default)
- Network is reachable; all three scripts download successfully

## Action
Run the one-line install command:
```bash
curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh | bash
```

## Expected Outcome
- `~/.df-factory/bin/df-onboard.sh`, `df-check-onboard.sh`, and `log-event.sh` are present and executable (`chmod +x`)
- `~/.zshrc` contains exactly one occurrence of:
  ```
  export PATH="$HOME/.df-factory/bin:$PATH"
  ```
  (using `$HOME`, not a literal tilde)
- Terminal output includes a message instructing the user to run `source ~/.zshrc` or restart their terminal
- Terminal output mentions that `df-onboard.sh` can be run after sourcing

## Failure Mode
N/A — install is atomic enough that re-running produces a clean state.

## Notes
The PATH line must use `$HOME` so it resolves correctly regardless of the user's home directory path.
