# Dark Factory — Shared Project Context

When working on a Dark Factory pipeline task, load project context before starting:

1. **Project profile**: Read `dark-factory/project-profile.md` if it exists. This contains the project's tech stack, architecture, conventions, and quality bar.
2. **Code map**: Read `dark-factory/code-map.md` if it exists. This contains the dependency graph, hotspots, and entry point traces.
3. **Manifest**: Read `dark-factory/manifest.json` to understand active features and their status.
4. **Memory index**: Read `dark-factory/memory/index.md` if it exists. This is a compact index of all project invariants, decisions, and shipped features — one heading row per entry with inline domain/type/status metadata. Treat a missing index as "not yet onboarded" — warn and proceed. Do NOT load shard files (`invariants-*.md`, `decisions-*.md`) from this rule; each agent's own system prompt specifies which domain shards to load based on the task at hand.

<!-- Token budget: index ≤ ~4,000 tokens (~500 entries at ~8 tokens/row). Per-shard ≤ ~8,000 tokens. Exceeding either is a signal to split a shard. -->

If these files do not exist, proceed without them — the pipeline still works, but agents will have less context about the target project.
