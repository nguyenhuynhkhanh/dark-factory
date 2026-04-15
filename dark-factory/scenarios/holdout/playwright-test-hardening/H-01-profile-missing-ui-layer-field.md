# Scenario: Profile exists but Tech Stack table has no UI Layer row

## Type
edge-case

## Priority
high -- backward compatibility with existing profiles that predate playwright-onboard

## Preconditions
- Project profile exists at `dark-factory/project-profile.md`
- Tech Stack table has rows for Language, Runtime, Framework, etc., but NO "UI Layer" row
- Playwright is installed in the project

## Action
Test-agent reads project profile in Step 0 and evaluates UI Layer in Step 0a.

## Expected Outcome
- Test-agent logs: "UI Layer field not found in profile -- proceeding with E2E detection"
- Test-agent proceeds to normal Playwright / E2E Detection (Step 0b) as if the exclusion gate does not exist
- All existing behavior is preserved: Playwright detection, scenario classification, E2E test writing and running
- Backend-only exclusion does NOT activate

## Notes
Validates EC-1. This is the backward compatibility case -- profiles generated before playwright-onboard runs will not have the UI Layer field.
