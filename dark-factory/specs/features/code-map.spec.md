# Feature: Code Map

## Context

Dark Factory agents currently rely on `project-profile.md` for project context, but this profile captures conventions and patterns at a high level. It does not capture how code is connected -- module dependencies, call chains, data flows, or shared hotspots. Every agent that needs to understand blast radius, trace execution paths, or estimate scope must independently grep and trace the codebase from scratch. This is slow, inconsistent across agents, and leads to missed dependencies.

A deep code map built during onboarding gives every agent a shared understanding of the codebase's structure. Spec-agents can estimate scope accurately. Architect-agents can assess blast radius without re-tracing every dependency. Code-agents know what contracts to preserve. Debug-agents can trace call chains from a pre-built graph.

## Scope

### In Scope (this spec)

- New Phase 3.5 in onboard-agent: parallel code map construction (partition, scan, synthesize)
- Smart exclusion logic (node_modules, vendor, generated code, binaries, .gitignore)
- Tech-stack-aware import/export detection (JS/TS, Python, Go, Java, Rust)
- Framework-specific heuristics (NestJS, Django, Spring, etc.)
- Module dependency graph with adjacency list
- Hotspot scoring: fan-in AND fan-out, threshold at 3+ importers
- Circular dependency detection
- Entry point tracing (route to DB, top 5-10)
- Interface/contract boundary summaries (module-level)
- Cross-cutting concern detection (middleware, decorators, base classes, event listeners)
- Dynamic/runtime dependency flagging (DI configs, event listeners, plugin manifests)
- Output file: `dark-factory/code-map.md` (companion file, NOT embedded in profile)
- Reference link from `project-profile.md` to `code-map.md`
- Output bounding by summarization (small <40 lines, medium <100, large <200)
- Developer sign-off before writing (same flow as profile confirmation)
- Incremental refresh: show summary diff on re-run
- Section-targeted reading instructions for all consuming agents
- Updates to all 7 agent files (onboard, spec, architect, code, debug, test, promote)
- Updates to both skill files (df-intake, df-debug) for lead/investigator prompts
- Plugin mirrors for all modified agent and skill files
- Test assertions for code map generation and consumption

### Out of Scope (explicitly deferred)

- Runtime/dynamic call chain tracing -- regex/grep only, zero new dependencies
- AST parsing -- would require language-specific parsers; regex patterns are sufficient for module-level analysis
- Field-level data flow tracking -- module-level summaries are the right granularity
- Visualization/graph rendering -- the adjacency list format is machine- and human-readable
- Automatic staleness detection -- developer triggers refresh manually via `/df-onboard`
- Function-level interface detail -- module-level export summaries only

### Scaling Path

If code maps prove valuable, future iterations could add:
- Automatic staleness detection (hash source files, flag when map is outdated)
- AST-based parsing for higher accuracy in complex codebases
- Incremental scanning (only re-scan changed files)
- Interactive graph visualization

## Requirements

### Functional

- FR-1: Onboard-agent Phase 3.5 partitions source files by top-level directory, applies smart exclusions, and splits into N chunks -- because scanners need independent, non-overlapping work units
- FR-2: One scanner agent per meaningful top-level source directory/package. The project folder structure determines the partition -- no fixed count, no artificial limit. Small related directories may be combined into one scanner's scope. The onboard-agent decides the partition based on directory structure and size -- because the project structure tells you how to partition, not an arbitrary number
- FR-3: Each scanner produces a structured report listing imports, exports, entry points, and cross-cutting patterns per file in its chunk -- because the synthesizer needs uniform input
- FR-4: Synthesizer merges scanner reports, builds module dependency graph (adjacency list grouped by package/directory), calculates hotspot scores (fan-in and fan-out), detects circular dependencies, traces top 5-10 entry points, identifies interface boundaries and cross-cutting concerns -- because this is the core analytical value
- FR-5: Output written to `dark-factory/code-map.md` with sections: Module Dependency Graph, Entry Point Traces, Shared Dependency Hotspots, Interface/Contract Boundaries, Cross-Cutting Concerns, Circular Dependencies, Dynamic/Runtime Dependencies -- because agents need structured, section-targeted access
- FR-6: `project-profile.md` updated with a reference link to `code-map.md` (not the content itself) -- because the profile should stay lean
- FR-6b: Synthesizer also generates `dark-factory/code-map.mermaid` -- a Mermaid diagram of the dependency graph for human visualization. Hotspots highlighted, circular dependencies marked. This file is for developer use only -- no agent reads it. Placed outside the .md file to keep code-map.md clean for agents
- FR-7: Output bounded by summarization: small project <40 lines, medium <100, large <200 -- because agents have context limits
- FR-8: Developer presented with code map for confirmation before writing to disk -- same sign-off flow as the profile
- FR-9: On incremental refresh (code map already exists), show summary diff: "N new modules, M dependency changes, K removed" -- because developers need to understand what changed
- FR-10: All 6 consuming agents (spec, architect, code, debug, test, promote) updated with section-targeted reading instructions per the consumption table -- because each agent needs different sections
- FR-11: df-intake lead prompts and df-debug investigator prompts updated to reference code map for scope estimation and call chain tracing -- because leads/investigators benefit from pre-built dependency data
- FR-12: Plugin mirrors updated to match all modified source files -- because the plugin distribution must stay in sync
- FR-13: Test file updated to assert code map generation instructions exist in onboard-agent and consumption instructions exist in all consuming agents -- because the test suite guards structural invariants
- FR-14: Smart exclusion list covers: node_modules/, vendor/, .venv/, target/, dist/, build/, .next/, out/, .git/, .claude/worktrees/; generated code (files with "generated" comments, prisma/client, __generated__/); binary files; .gitignore entries; per-tech-stack known dependency directories -- because scanning library/generated/binary code wastes time and produces noise
- FR-15: Tech-stack-aware import detection covers JS/TS (import, require, dynamic import, NestJS @Module, barrel re-exports), Python (import, from...import, relative imports, __init__.py, Django INSTALLED_APPS), Go (import blocks, package declarations), Java (import, @Autowired, @Inject, Spring DI), Rust (use, mod, extern crate) -- because each language has different dependency declaration patterns
- FR-16: Include Dark Factory instruction files (.claude/agents/, .claude/skills/, .claude/rules/) in scan scope -- because DF files are project code that agents need to understand
- FR-17: Scanners have NO hard cap on files read -- they analyze everything in their chunk; quality over velocity

### Non-Functional

- NFR-1: Zero new dependencies -- all analysis done with regex/grep/glob, consistent with the project's zero-dependency constraint
- NFR-2: Code map generation must not block on profile generation -- Phase 3.5 runs after Phase 3 (Architecture & Patterns) completes
- NFR-3: Scanner agents are fully independent -- no shared state, no inter-scanner communication
- NFR-4: Code map is treated as an atomic unit for developer accept/reject -- not per-edge or per-section

## Data Model

### New file: `dark-factory/code-map.md`

```markdown
# Code Map
> Auto-generated by Dark Factory onboard-agent. Last analyzed: {ISO date}

## Module Dependency Graph
{Adjacency list grouped by package/directory}
{Module -> [imports from]}

## Entry Point Traces
{Top entry points with call chains: route -> controller -> service -> repo -> DB}

## Shared Dependency Hotspots
{Modules sorted by fan-in count, threshold: imported by 3+ others}
{Also flag high fan-out modules}

## Interface/Contract Boundaries
{Module-level export summaries: "UserService exports 12 methods, imported by 8 modules"}

## Cross-Cutting Concerns
{Middleware chains, decorators, base classes, event listeners, shared utilities}

## Circular Dependencies
{Detected cycles with module paths}

## Dynamic/Runtime Dependencies
{DI container configs, event listeners, plugin manifests -- flagged as "runtime-only, not statically traceable"}
```

### Modified file: `dark-factory/project-profile.md`

Add a reference line after the "How This Profile Is Used" section:

```markdown
> See also: [Code Map](code-map.md) -- module dependencies, call chains, hotspots, and cross-cutting concerns.
```

Update the agent consumption table to add a row:

```markdown
| **All agents** | Also read `dark-factory/code-map.md` -- see code-map for section-targeted guidance |
```

## Migration & Deployment

N/A -- no existing data affected. This feature creates a new file (`dark-factory/code-map.md`) that does not exist yet. The `project-profile.md` change is additive (new reference line). All agent/skill file changes are additive (new instructions appended). No existing behavior changes; existing profiles without a code-map reference continue to work -- agents that look for `code-map.md` and don't find it should proceed without it.

## API Endpoints

N/A -- this is an agent instruction feature, not an API feature.

## Business Rules

- BR-1: Scanners must distinguish project code from library code -- scanning node_modules or vendor directories wastes context and produces misleading dependency graphs
- BR-2: Output is bounded by summarization, not by capping analysis depth -- scanners read ALL files in their chunk, but the synthesizer summarizes to module-level; this ensures nothing is missed while keeping output manageable
- BR-3: Code map is a companion file, not embedded in the profile -- the profile stays lean (~50-100 lines) while the code map can grow independently up to 200 lines for large projects
- BR-4: Hotspot threshold is 3+ importers for fan-in flagging -- below this threshold, being imported is normal; above it, changes have meaningful blast radius
- BR-5: Circular dependencies are detected and flagged but do not block map generation -- they are informational for architects and debug-agents
- BR-6: Dynamic dependencies are flagged as "runtime-only, not statically traceable" -- agents must know these connections exist but cannot rely on them for static analysis
- BR-7: Developer sign-off is required before writing code-map.md -- same contract as project-profile.md
- BR-8: On incremental refresh, code map is treated as atomic for accept/reject -- developer cannot accept some edges and reject others
- BR-9: Barrel files must be traced through to actual source and flagged as re-export hubs -- otherwise dependency graphs show misleading connections through index files
- BR-10: Mixed-language projects handle each language independently and note cross-language boundaries -- because import patterns differ per language
- BR-11: Monorepo projects map inter-package dependencies first, then intra-package -- because package boundaries are the primary organizational unit
- BR-12: Each consuming agent reads ONLY the code map sections relevant to its role, per the consumption table -- because reading the full map wastes context for agents that only need a subset

## Error Handling

| Scenario | Response | Side Effects |
|----------|----------|--------------|
| Greenfield project (no source code) | Write "No code map -- no source code yet" to code-map.md | None |
| Tiny project (<5 files) | Write minimal map or "Project is small -- Architecture section covers all relationships" | None |
| Flat script directory (no module structure) | Write file-level dependency list instead of module-level | None |
| Scanner agent fails/times out | Synthesizer works with reports from successful scanners; flags incomplete coverage | Log warning in code map header |
| No imports detected in a file | File listed with empty dependency list | None |
| .gitignore not found | Proceed with default exclusion list only | None |
| Circular dependency detected | Flag in Circular Dependencies section; continue graph building | None |
| Generated code detected | Exclude from scan; note exclusion in map header | None |
| Binary files encountered | Skip silently | None |
| Developer rejects code map | Do NOT write code-map.md; report that code map was rejected | None |
| Existing code-map.md but developer rejects refresh | Preserve existing code-map.md unchanged | None |

## Acceptance Criteria

- [ ] AC-1: Running `/df-onboard` on a project with source code produces `dark-factory/code-map.md` with all 7 sections
- [ ] AC-2: `project-profile.md` contains a reference link to `code-map.md`
- [ ] AC-3: Scanner count matches project folder structure (one per meaningful top-level source directory, small dirs combined)
- [ ] AC-4: Smart exclusions skip node_modules, vendor, .venv, generated code, binaries, .gitignore entries
- [ ] AC-5: Module dependency graph uses adjacency list format grouped by directory
- [ ] AC-6: Hotspot section shows modules with fan-in >= 3, sorted by fan-in count; also flags high fan-out
- [ ] AC-7: Circular dependencies are detected and listed (or "None detected")
- [ ] AC-8: Entry point traces show top 5-10 call chains from route to data layer
- [ ] AC-9: Output respects size bounds (<40/100/200 lines for small/medium/large)
- [ ] AC-10: Developer is prompted for confirmation before code-map.md is written
- [ ] AC-11: Incremental refresh shows summary diff before confirmation
- [ ] AC-12: All 6 consuming agents reference `dark-factory/code-map.md` with section-targeted instructions
- [ ] AC-13: df-intake lead prompts mention code map for scope estimation
- [ ] AC-14: df-debug investigator prompts mention code map for call chain tracing
- [ ] AC-15: Plugin mirrors match all modified source files exactly
- [ ] AC-16: Test file asserts code map generation in onboard-agent and consumption in all agents
- [ ] AC-17: Greenfield project produces "No code map" stub
- [ ] AC-18: Tech-stack-aware import detection covers at minimum JS/TS import/require patterns
- [ ] AC-19: Dark Factory instruction files (.claude/agents/, .claude/skills/) are included in scan

## Edge Cases

- EC-1: Greenfield project (no source code) -- produce stub "No code map -- no source code yet"
- EC-2: Tiny project (<5 source files) -- produce minimal map or defer to Architecture section
- EC-3: Flat script directory (no packages/modules) -- use file-level dependency list
- EC-4: Barrel files (index.ts re-exports) -- trace through to actual source, flag as re-export hub
- EC-5: Circular dependencies -- detect cycles, flag them, do not infinite-loop during graph traversal
- EC-6: Dynamic imports/dependencies -- detect patterns (DI configs, event listeners), flag as runtime-only
- EC-7: Generated/vendored code mixed with project code -- detect via comments/patterns, exclude
- EC-8: Mixed-language project -- handle each language independently, note cross-language boundaries
- EC-9: Monorepo with multiple packages -- map inter-package deps first, then intra-package
- EC-10: Scanner agent fails mid-scan -- synthesizer works with available reports, flags incomplete coverage
- EC-11: Very large project (500+ files) -- one scanner per top-level directory, output still bounded by summarization rules
- EC-12: Project with only config files and no imports -- empty dependency graph, note in map
- EC-13: Developer rejects code map on initial generation -- do not write file
- EC-14: Developer rejects code map refresh -- preserve existing file unchanged
- EC-15: No .gitignore file present -- use default exclusion list only
- EC-16: Existing code-map.md from previous onboard run -- show diff, allow accept/reject

## Dependencies

### Shared resources this feature touches:
- `dark-factory/project-profile.md` -- ADDITIVE ONLY: adds a reference link line and updates the consumption table. No existing content changed.
- `.claude/agents/onboard-agent.md` -- adds Phase 3.5. Existing phases unchanged.
- `.claude/agents/spec-agent.md` -- adds code map reading instruction to Phase 1
- `.claude/agents/architect-agent.md` -- adds code map reading instruction to Step 1
- `.claude/agents/code-agent.md` -- adds code map reading instruction to General Patterns
- `.claude/agents/debug-agent.md` -- adds code map reading instruction to Phase 2
- `.claude/agents/test-agent.md` -- adds code map reading instruction to Step 0
- `.claude/agents/promote-agent.md` -- adds code map reading instruction to Step 1
- `.claude/skills/df-intake/SKILL.md` -- adds code map reference to lead prompts
- `.claude/skills/df-debug/SKILL.md` -- adds code map reference to investigator prompts
- `plugins/dark-factory/` -- mirrors of all above
- `tests/dark-factory-setup.test.js` -- adds new test describe block

### Cross-feature impact:
All changes are ADDITIVE. No existing instructions are modified or removed. Agents that currently work without a code map will continue to work if no code map exists. The code map reading instructions should include a guard: "if `dark-factory/code-map.md` exists, read the following sections..."

## Implementation Size Estimate

- **Scope size**: x-large (19 files: 10 source files + 9 plugin mirrors)
- **Suggested parallel tracks**: 3 code-agents

  **Track 1 -- Onboard Agent + Skill Mirror** (2 files, zero overlap with other tracks)
  - `.claude/agents/onboard-agent.md` -- add Phase 3.5 (partition, scan, synthesize)
  - `plugins/dark-factory/agents/onboard-agent.md` -- exact mirror

  **Track 2 -- Consuming Agents + Skill Integrations + Mirrors** (16 files, zero overlap with other tracks)
  - `.claude/agents/spec-agent.md` + plugin mirror
  - `.claude/agents/architect-agent.md` + plugin mirror
  - `.claude/agents/code-agent.md` + plugin mirror
  - `.claude/agents/debug-agent.md` + plugin mirror
  - `.claude/agents/test-agent.md` + plugin mirror
  - `.claude/agents/promote-agent.md` + plugin mirror
  - `.claude/skills/df-intake/SKILL.md` + plugin mirror
  - `.claude/skills/df-debug/SKILL.md` + plugin mirror

  **Track 3 -- Tests** (1 file, zero overlap with other tracks)
  - `tests/dark-factory-setup.test.js` -- add code map test assertions

## Implementation Notes

### Patterns to follow

- **Onboard-agent phase structure**: Follow the existing Phase 1-7 pattern. Phase 3.5 sits between Phase 3 (Architecture & Patterns) and Phase 4 (Quality Bar). Use the same markdown heading style (`### Phase 3.5: Code Map Construction`).

- **Agent reading instructions**: Each consuming agent already has a pattern for reading `project-profile.md` with section-targeted bullet points (e.g., code-agent says "focus on these sections: Tech Stack, Architecture..."). Follow the same pattern for code-map.md, adding a conditional guard: "If `dark-factory/code-map.md` exists, read the following sections: ..."

- **Skill lead/investigator prompts**: df-intake already has 3 lead prompts (A, B, C) that say "read `dark-factory/project-profile.md`". Add a similar line: "Also read `dark-factory/code-map.md` if it exists -- use the {relevant section} for {purpose}."

- **Plugin mirrors**: The test file already enforces source-plugin parity (see "Plugin mirrors" test block in `tests/dark-factory-setup.test.js`). After modifying any source file, copy it verbatim to the corresponding plugin path.

- **Test assertions**: Follow the existing test pattern -- string includes/matches on file content. See the "Project onboarding" test block for the pattern. New tests should assert:
  - onboard-agent.md contains "code-map" or "Code Map"
  - onboard-agent.md contains scanner/synthesizer language
  - All 6 consuming agents reference "code-map.md"
  - df-intake SKILL.md mentions code map in lead prompts
  - df-debug SKILL.md mentions code map in investigator prompts
  - Plugin mirrors match source for all modified files

- **Onboard-agent write targets**: Currently the agent's Constraints section says "ONLY write to `dark-factory/project-profile.md` and `.claude/settings.json`". This MUST be updated to also allow writing `dark-factory/code-map.md`.

- **Scanner agent spawning**: The onboard-agent does not currently spawn sub-agents. The Phase 3.5 instructions should use the Agent tool with worktree isolation, similar to how df-intake spawns 3 leads. Each scanner gets a prompt with its chunk of directories and outputs a structured report.

- **Section-targeted consumption table** (from confirmed scope):

| Agent | Code Map Sections |
|-------|------------------|
| spec-agent | Dependency Graph, Hotspots |
| architect-agent | Full map |
| code-agent | Entry Points, Contract Boundaries |
| debug-agent | Entry Points, Dependency Graph |
| test-agent | Entry Points, Hotspots |
| promote-agent | Hotspots |

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 | P-01, H-01 |
| FR-2 | P-01, P-02, H-06, H-07 |
| FR-3 | P-01 |
| FR-4 | P-01, P-03, P-04, P-05 |
| FR-5 | P-01 |
| FR-6 | P-06 |
| FR-7 | P-02, H-06, H-07 |
| FR-8 | P-07, H-08 |
| FR-9 | P-08, H-09 |
| FR-10 | P-09 |
| FR-11 | P-10 |
| FR-12 | P-11 |
| FR-13 | P-12 |
| FR-14 | P-01, H-01, H-02 |
| FR-15 | P-03, H-03, H-04, H-05 |
| FR-16 | H-10 |
| FR-17 | P-01 |
| BR-1 | P-01, H-01, H-02 |
| BR-2 | P-02, H-07 |
| BR-3 | P-06 |
| BR-4 | P-04 |
| BR-5 | P-05, H-11 |
| BR-6 | P-03, H-05 |
| BR-7 | P-07, H-08 |
| BR-8 | H-09 |
| BR-9 | H-12 |
| BR-10 | H-13 |
| BR-11 | H-14 |
| BR-12 | P-09 |
| EC-1 | P-13 |
| EC-2 | P-14 |
| EC-3 | H-15 |
| EC-4 | H-12 |
| EC-5 | P-05, H-11 |
| EC-6 | H-05 |
| EC-7 | H-02 |
| EC-8 | H-13 |
| EC-9 | H-14 |
| EC-10 | H-16 |
| EC-11 | H-07 |
| EC-12 | H-17 |
| EC-13 | H-08 |
| EC-14 | H-09 |
| EC-15 | H-18 |
| EC-16 | P-08, H-09 |
| EH-1 (Greenfield) | P-13 |
| EH-2 (Tiny project) | P-14 |
| EH-3 (Flat script dir) | H-15 |
| EH-4 (Scanner fails) | H-16 |
| EH-5 (No imports) | H-17 |
| EH-6 (.gitignore missing) | H-18 |
| EH-7 (Circular dep) | P-05, H-11 |
| EH-8 (Generated code) | H-02 |
| EH-9 (Binary files) | H-01 |
| EH-10 (Dev rejects map) | H-08 |
| EH-11 (Dev rejects refresh) | H-09 |
