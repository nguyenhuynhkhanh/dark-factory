# Scenario: Template files exist after Phase 1

## Type
feature

## Priority
critical — templates are the foundation for token savings; if they do not exist, agents cannot reference them

## Preconditions
- Phase 1 implementation is complete
- No prior template files existed

## Action
Check that all 3 template files exist at the expected paths:
- `dark-factory/templates/spec-template.md`
- `dark-factory/templates/debug-report-template.md`
- `dark-factory/templates/project-profile-template.md`

## Expected Outcome
- All 3 files exist and are non-empty
- Each file contains the key structural markers from the original inline templates:
  - spec-template.md contains `# Feature: {name}`, `## Context`, `## Scope`, `## Requirements`, `## Business Rules`, `## Edge Cases`
  - debug-report-template.md contains `# Debug Report: {name}`, `## Symptom`, `## Root Cause`, `## Impact Analysis`, `## Systemic Analysis`
  - project-profile-template.md contains `# Project Profile`, `## Overview`, `## Tech Stack`, `## Architecture`, `## Testing`

## Notes
Corresponds to AC-1. This is the most basic validation that extraction happened.
