# Scenario: Extracted templates are verbatim copies of original inline content

## Type
edge-case

## Priority
critical — any modification during extraction could change agent behavior, violating NFR-2

## Preconditions
- Phase 1 implementation is complete
- Original inline templates are known from the pre-modification agent files

## Action
Compare the extracted template files against the original inline template content that was embedded in the agent files. Verify key structural elements are identical:
- spec-template.md must contain the exact section headers and placeholder text from spec-agent's original `### Feature Spec Template` block
- debug-report-template.md must contain the exact section headers from debug-agent's original `## Debug Report Template` block
- project-profile-template.md must contain the exact section headers and table structure from onboard-agent's original `## Project Profile Template` block

## Expected Outcome
- Templates are content-identical to the original inline versions (excluding the markdown code fence wrappers that enclosed them in the agent files)
- No sections have been added, removed, or reworded during extraction

## Notes
Corresponds to BR-5, NFR-2. Verbatim extraction is critical because any rewording could change LLM behavior.
