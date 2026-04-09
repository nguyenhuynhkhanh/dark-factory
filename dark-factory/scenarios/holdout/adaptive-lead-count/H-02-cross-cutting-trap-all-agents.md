# Scenario: Cross-cutting trap — "update the agent prompts to also read X" implies all agents

## Type
edge-case

## Priority
critical — this is the most common false-negative pattern: a description that sounds like 1–2 files but implies N files because of an "all agents" pattern

## Preconditions
- `dark-factory/project-profile.md` exists and lists all agent files
- `dark-factory/code-map.md` may or may not exist
- Developer runs: `/df-intake Update the agent prompts to also read the cost-budget.md file before starting work`

## Action
The orchestrator runs scope evaluation on the description above.

Analysis:
- C1 (files implied): "agent prompts" is plural and unqualified — the project has 9 agent markdown files. The description does not say "one agent" or name a specific agent. Implied file count ≥ 9. C1 is false.
- C3 (cross-cutting keywords): "every" is not present, but "agent prompts" (plural, unqualified) implies all agents — this is the semantic equivalent of "all agents". The keyword check must catch this pattern either as a C3 keyword match or as a C1 multi-file implication.

At least one of C1 or C3 is false. Therefore 3 leads must be selected.

## Expected Outcome
1. The scope evaluation block identifies the multi-file implication:
   ```
   Scope evaluation:
   - Files implied: 9 (all agent .md files — "agent prompts" is unqualified)
   - Concern type: cross-cutting (applies to all agents)
   - Cross-cutting keywords: found: "all agents" pattern (unqualified "agent prompts")
   - Ambiguity markers: none
   - Code-map blast radius: high (9 agent files)
   → 3 leads. "Agent prompts" without qualification implies all 9 agents — cross-cutting scope.
   ```
2. THREE spec-agents are spawned.
3. The scope evaluation block explicitly identifies WHY the description implies all agents — it must not simply say "3 leads" without explanation.

## Failure Mode
If the orchestrator selects 1 lead, it failed to parse that "agent prompts" (unqualified plural) implies N agent files. The code-agent would receive a 1-lead spec covering only 1-2 files but the implementation would actually touch 9 files — a catastrophic scope underestimate.

If the orchestrator selects 3 leads but the eval block says "1 file implied", the block is wrong and provides no useful information to the developer.

## Notes
This holdout tests the semantic interpretation requirement of C1 and C3 — the algorithm must reason about what the description *implies*, not just count explicit file names. This is harder to implement correctly than simple keyword matching, which is why it is a holdout rather than a public scenario.

The wording "update the agent prompts to also read X" is intentionally crafted to sound innocuous. It doesn't say "all agents", "every agent", or "pipeline". The trap is in "prompts" (plural, no qualifier).
