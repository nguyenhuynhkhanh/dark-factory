# Scenario: P-02 — Install on bash machine adds PATH to ~/.bashrc

## Type
feature

## Priority
high — covers the Linux developer path; bash is the typical default on Linux CI machines and developer workstations

## Preconditions
- Clean machine: `~/.df-factory/` does not exist
- `~/.bashrc` exists but does not contain any reference to `df-factory`
- `$SHELL` is set to `/bin/bash`
- Network is reachable

## Action
Run the one-line install command:
```bash
curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh | bash
```

## Expected Outcome
- Three scripts installed to `~/.df-factory/bin/` and executable
- `~/.bashrc` contains exactly one occurrence of:
  ```
  export PATH="$HOME/.df-factory/bin:$PATH"
  ```
- `~/.zshrc` is NOT modified (should not exist or remain unchanged)
- Terminal output includes a message instructing the user to run `source ~/.bashrc` or restart their terminal

## Failure Mode
N/A

## Notes
The scenario verifies that shell detection does not hard-code zsh; `$SHELL` must be read and acted on.
