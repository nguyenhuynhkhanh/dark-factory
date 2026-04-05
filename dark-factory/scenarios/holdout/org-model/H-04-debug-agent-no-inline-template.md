# Scenario: debug-agent.md no longer contains the full inline debug report template

## Type
feature

## Priority
high — verifies template removal for debug-agent specifically

## Preconditions
- Phase 1 implementation is complete

## Action
Read `.claude/agents/debug-agent.md` and search for distinctive template markers:
- `## Symptom` as a standalone section (from the template, not process text)
- `## Reproduction` with sub-sections `### Steps` and `### Conditions`
- `## Systemic Analysis` with `### Similar Patterns Found` and `### Classification`
- `## Regression Risk Assessment`
- The template table `| Path | How Affected | Risk |`

## Expected Outcome
- The agent file does NOT contain the full debug report template block
- The agent file DOES contain a reference instruction pointing to `dark-factory/templates/debug-report-template.md`

## Notes
Corresponds to BR-2, FR-1.
