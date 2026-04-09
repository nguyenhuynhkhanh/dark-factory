# Scenario: P-06 — README prerequisites section lists curl; explicitly excludes jq

## Type
feature

## Priority
medium — prevents support requests from users who install jq unnecessarily, and prevents confusion for users who don't have jq and wonder if the install will fail

## Preconditions
- `README.md` has been updated per the spec

## Action
Read the prerequisites section of `README.md`.

## Expected Outcome
- A prerequisites section exists (could be titled "Prerequisites", "Requirements", or similar)
- `curl` is listed as a required prerequisite
- The section either explicitly states `jq` is NOT required, or `jq` is entirely absent from the prerequisites list with no other README section implying it is needed
- No mention of `jq` appears as a required dependency anywhere in the README

## Failure Mode
N/A

## Notes
The jq-removal spec is separate, but this README update must not introduce or reintroduce a jq dependency claim.
