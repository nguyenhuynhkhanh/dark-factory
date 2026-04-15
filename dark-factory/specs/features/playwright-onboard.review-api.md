## Domain Review: API Design & Backward Compatibility

### Feature: playwright-onboard
### Status: APPROVED

### Findings
- **Blockers**: None
- **Concerns**: None
- **Suggestions**: None

### Key Decisions
- No API surface: This spec has no API endpoints, no contracts, no versioning concerns. It modifies agent instructions and a markdown template.
- Backward compatibility: Existing profiles generated before this change will simply lack the four new fields. The onboard-agent's incremental refresh flow will detect and add them on next run. No breaking change to any consumer.
- Field design: The four fields (UI Layer, Frontend Framework, E2E Framework, E2E Ready) use simple, predictable values (yes/no/none/framework-name/unknown). This makes downstream consumption straightforward when follow-up specs add it.
- Error handling contract: The spec defines clear fallback values for every error scenario (no package.json = unknown, malformed = unknown, no deps = none). Consistent and predictable.
