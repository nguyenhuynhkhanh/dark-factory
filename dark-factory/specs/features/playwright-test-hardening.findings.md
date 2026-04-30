## Key Decisions Made

- **Backend-only exclusion gate**: Absolute skip of E2E when UI Layer is "none" (case-insensitive). Missing field proceeds normally.
- **Dev server cascade**: fail-soft cascade (playwright.config → profile → npm run dev). 30s timeout → skip E2E, proceed with unit tests.
- **flakyE2E as single authoritative signal**: One boolean drives routing; prevents split-brain.
- **Additive results format**: `flaky-e2e` type and `flakyE2E` field are additive; existing types unchanged.
- **Inline logic in agent markdown**: Right-sized for current scope; extraction path documented.
- **Process group kill for cleanup**: Mandatory regardless of test outcome.

## Remaining Notes

- `kill -- -$PID` cleanup is Unix-specific; Windows compatibility is a future concern.
- New `flaky-e2e` type is additive; future consumers of results format should be aware.
- `devServerSource` enum field in results metadata is new and backward-compatible.
