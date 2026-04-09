# Scenario: H-10 — Script downloaded and run directly (not via pipe) behaves identically

## Type
edge-case

## Priority
medium — the README's security note explicitly offers this as an alternative for security-conscious users; it must actually work

## Preconditions
- Clean machine: `~/.df-factory/` does not exist
- `~/.zshrc` does not contain any df-factory PATH line
- `$SHELL` is `/bin/zsh`
- User has downloaded the raw script manually:
  ```bash
  curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh -o /tmp/install.sh
  chmod +x /tmp/install.sh
  ```

## Action
Run the downloaded script directly:
```bash
bash /tmp/install.sh
```

## Expected Outcome
- Identical outcome to P-01: scripts installed to `~/.df-factory/bin/`, PATH line appended to `~/.zshrc`, source message printed
- The script does not require being piped from curl; it has no dependency on stdin
- Exit code is 0

## Failure Mode
If the script behaves differently when run directly (e.g., hangs waiting for stdin, fails to detect scripts to download because of path assumptions), the implementation has a dependency on the pipe execution mode.

## Notes
This covers EC-7. The README security note points users to this URL for review; they will then likely run it this way. The two execution modes must be equivalent.
