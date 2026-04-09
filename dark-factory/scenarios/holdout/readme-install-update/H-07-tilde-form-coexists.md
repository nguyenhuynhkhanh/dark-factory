# Scenario: H-07 — Profile already has tilde-form PATH entry; $HOME-form is still appended

## Type
edge-case

## Priority
low — this is an uncommon state (user manually added a tilde form before the script existed) but the behavior should be well-defined and not cause silent PATH failure

## Preconditions
- `~/.df-factory/bin/` already installed
- `~/.zshrc` contains a manually added line in the tilde form:
  ```
  export PATH="~/.df-factory/bin:$PATH"
  ```
  (tilde, not `$HOME`)
- `$SHELL` is `/bin/zsh`

## Action
Run the install command:
```bash
curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh | bash
```

## Expected Outcome
- The install script appends the `$HOME` form because the exact `$HOME` form is not found:
  ```
  export PATH="$HOME/.df-factory/bin:$PATH"
  ```
- `~/.zshrc` now contains both forms (the user's tilde form and the script's `$HOME` form)
- The script does NOT remove or replace the tilde form — it only manages its own line
- The user ends up with a working PATH (both entries resolve to the same directory; having both is harmless)

## Failure Mode
If the script incorrectly treats the tilde form as equivalent to the `$HOME` form and skips the append, the PATH will still work (since the user had the tilde form), but the behavior violates BR-1 (idempotency must match the exact `$HOME` form).

## Notes
This is a known limitation documented in EC-3. The spec accepts that two entries may exist. The test verifies the script does not crash, does not replace the user's entry, and appends its own canonical form.
