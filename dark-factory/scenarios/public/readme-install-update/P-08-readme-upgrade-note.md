# Scenario: P-08 — README upgrade note instructs re-running the install command

## Type
feature

## Priority
medium — without this, developers who want to upgrade don't know the procedure and may try manual approaches that leave stale files

## Preconditions
- `README.md` has been updated per the spec

## Action
Read `README.md` for any upgrade or update section.

## Expected Outcome
- An upgrade section exists (may be combined with install section or uninstall section)
- It instructs the developer to re-run the original install command:
  ```
  curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh | bash
  ```
- The section notes that the operation is safe to re-run (idempotent)

## Failure Mode
N/A

## Notes
The upgrade note can be brief — a single sentence with the command is sufficient. It must not suggest any manual file replacement steps.
