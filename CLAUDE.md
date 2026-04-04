# Project Instructions

<!-- Dark Factory instructions are loaded automatically from .claude/rules/dark-factory.md -->

## Dark Factory Commands

- `/df-onboard` — Map the project architecture, conventions, and quality bar
- `/df-intake {description}` — Start feature spec creation (3 parallel leads)
- `/df-debug {description}` — Start bug investigation (3 parallel investigators)
- `/df-orchestrate {name} [name2...] | --group {name} | --all [--force]` — Start implementation with dependency-aware parallel worktrees
- `/df-cleanup` — Recovery/maintenance for stuck features
- `/df-spec` — Show spec templates
- `/df-scenario` — Show scenario templates

## Feature Pipeline
1. Spec phase (`/df-intake`): 3 spec-agents → synthesized spec → smart decomposition into smaller specs
2. Architect review (tiered by scope)
3. Implementation in parallel worktrees (up to 4 code-agents per spec)
4. Holdout validation → promote tests → cleanup

## Bugfix Pipeline
1. Investigation (`/df-debug`): 3 debug-agents → synthesized report
2. Architect review
3. Red-green fix: failing test first → minimal fix → holdout validation
4. Promote tests → cleanup
