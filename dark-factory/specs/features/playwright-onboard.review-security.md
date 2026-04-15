## Domain Review: Security & Data Integrity

### Feature: playwright-onboard
### Status: APPROVED

### Findings
- **Blockers**: None
- **Concerns**: None
- **Suggestions**: None

### Key Decisions
- No security surface: This spec modifies agent markdown instructions and a markdown template. There is no executable code, no data store, no API endpoint, no user input handling. The "detection" is performed by the onboard-agent (an AI) reading package.json content -- not programmatic parsing that could be exploited.
- Data integrity: The spec correctly handles all error cases (missing package.json, malformed package.json, no dependencies) by defaulting to `unknown` or `none`. The profile fields are simple string values written to a markdown table. No risk of data corruption.
- BR-1 (explicit allowlist): The use of an explicit allowlist rather than heuristic matching prevents false positives from package names that contain framework names as substrings. This is the correct approach.
- NFR-1 (no install commands): The spec explicitly prohibits running install commands or external processes, eliminating any side-effect risk during detection.
