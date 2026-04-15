# Feature: playwright-onboard

## Context

The test-agent and promote-agent already contain full Playwright E2E support in their agent definitions. However, the test-agent currently re-detects Playwright infrastructure from scratch every time it runs. There is no mechanism for the onboard-agent to detect and record whether a project has a browser UI layer and Playwright installed during onboarding.

This is foundational: downstream agents (test-agent, promote-agent) need a profile signal to decide whether to skip E2E entirely for backend-only projects, and to avoid redundant detection on every run.

## Scope

### In Scope (this spec)
- Add UI layer and E2E detection logic to `onboard-agent.md` (new Phase 2.5 between Tech Stack and Architecture)
- Add four new fields to the project profile template: `UI Layer`, `Frontend Framework`, `E2E Framework`, `E2E Ready`
- Detect frontend framework presence from dependencies (React, Vue, Angular, Next.js, Nuxt, Svelte, SvelteKit, Remix, Gatsby, Astro, Solid, Qwik, Ember, Lit)
- Detect E2E framework presence from dependencies (`@playwright/test`, `playwright`, `cypress`, `puppeteer`)
- Detect E2E readiness (framework installed + config present)
- When ambiguous (no framework detected but HTML/template files exist), ask the developer
- Plugin mirrors must match source files exactly

### Out of Scope (explicitly deferred)
- Modifying test-agent to read profile fields instead of self-detecting (separate spec)
- Modifying promote-agent to read profile fields (separate spec)
- Auto-installing Playwright during onboard (test-agent already offers this)
- Detecting other E2E tools beyond Playwright and Cypress (Puppeteer noted but not prioritized)
- Browser installation detection (`npx playwright install --dry-run`) -- too slow and fragile for onboard

### Scaling Path
Once the profile fields exist, a follow-up spec can make test-agent and promote-agent read `E2E Ready` from the profile instead of detecting on every run. The fields are designed to support that without schema changes.

## Requirements

### Functional
- FR-1: The onboard-agent MUST detect the presence of a frontend framework by scanning `package.json` dependencies and devDependencies for known framework packages. -- Eliminates manual classification for the vast majority of projects.
- FR-2: The onboard-agent MUST detect E2E framework installation by scanning `package.json` dependencies/devDependencies for `@playwright/test`, `playwright`, or `cypress`. -- Enables downstream agents to skip E2E entirely when no framework exists.
- FR-3: The onboard-agent MUST check for E2E config files (`playwright.config.*`, `cypress.config.*`) as a secondary signal alongside dependency detection. -- A dependency without a config file means the framework is installed but not configured.
- FR-4: When no frontend framework is detected in dependencies BUT the project contains `.html`, `.vue`, `.svelte`, `.jsx`, `.tsx`, or template files in meaningful quantity (more than incidental), the onboard-agent MUST ask the developer whether the project has a UI layer. -- Avoids false negatives for projects using non-standard setups (e.g., Vanilla JS, Web Components, server-rendered templates).
- FR-5: The project profile template MUST include four new fields in the Tech Stack table: `UI Layer` (yes/no), `Frontend Framework` (detected name or "none"), `E2E Framework` (Playwright/Cypress/none), `E2E Ready` (yes/no). -- Provides a single source of truth for downstream agents.
- FR-6: The `E2E Ready` field MUST be `yes` only when BOTH an E2E framework dependency AND a corresponding config file are detected. -- Prevents false positives where a dependency exists but was never configured.
- FR-7: During incremental refresh (existing profile), the onboard-agent MUST re-detect UI/E2E fields and present changes to the developer alongside other section changes. -- Follows the existing incremental refresh pattern.

### Non-Functional
- NFR-1: Detection MUST complete without running any install commands or spawning external processes beyond file reads. -- Onboarding must be fast and side-effect-free.
- NFR-2: The detection logic MUST be positioned in the onboard-agent process AFTER Phase 2 (Tech Stack) and BEFORE Phase 3 (Architecture), since it depends on dependency data from Phase 2. -- Logical ordering.

## Data Model

No database or schema changes. The only data change is four new rows in the Tech Stack table of the project profile markdown file.

New fields in `## Tech Stack` table:

| Field | Values | Description |
|-------|--------|-------------|
| `UI Layer` | `yes` / `no` | Whether the project has a browser-facing UI |
| `Frontend Framework` | Framework name or `none` | Detected framework (React, Vue, Angular, Next.js, etc.) |
| `E2E Framework` | `Playwright` / `Cypress` / `none` | Detected E2E test framework |
| `E2E Ready` | `yes` / `no` | Framework installed AND config present |

## Migration & Deployment

N/A -- no existing data affected. The project profile template gains new rows, but existing profiles generated before this change will simply lack these fields. The onboard-agent's incremental refresh flow will detect the missing fields and add them on next `/df-onboard` run.

## API Endpoints

N/A -- this is an agent definition change, not an API change.

## Business Rules
- BR-1: Frontend framework detection uses an explicit allowlist of package names, not heuristic scanning. -- Prevents false positives from packages that happen to contain "react" or "vue" in their name (e.g., `react-icons` is not a framework).
- BR-2: The allowlist of frontend framework packages: `react`, `vue`, `@angular/core`, `next`, `nuxt`, `svelte`, `@sveltejs/kit`, `@remix-run/react`, `gatsby`, `astro`, `solid-js`, `@builder.io/qwik`, `ember-source`, `lit`. -- Covers all mainstream frameworks as of 2026.
- BR-3: The allowlist of E2E framework packages: `@playwright/test`, `playwright`, `cypress`. -- These are the only two widely-used E2E frameworks with first-class DF support considerations.
- BR-4: If multiple frontend frameworks are detected, list all of them comma-separated in the `Frontend Framework` field. -- Monorepos and migration projects may legitimately have multiple frameworks.
- BR-5: If both Playwright and Cypress are detected, list both comma-separated in the `E2E Framework` field. -- Some projects use both.
- BR-6: `UI Layer` is `yes` if ANY frontend framework is detected OR the developer confirms UI presence when asked. It is `no` only if no framework is detected AND either no ambiguous files exist OR the developer explicitly says no UI. -- Conservative: defaults toward detection rather than false negatives.
- BR-7: The developer question (FR-4) MUST be asked as part of the existing Phase 6 developer question batch, not as a separate interruption. -- Minimizes developer interruptions during onboard.
- BR-8: For greenfield projects (no source code), all four fields default to `unknown` and the developer is asked about intended UI layer in Phase 6. -- Cannot detect what does not exist yet.

## Error Handling

| Scenario | Behavior | Side Effects |
|----------|----------|--------------|
| No `package.json` found | Set all four fields to `unknown`, note in Structural Notes | None |
| `package.json` exists but has no dependencies | Set Frontend Framework to `none`, E2E Framework to `none`, determine UI Layer from file scan or developer question | None |
| `package.json` is malformed / unreadable | Set all four fields to `unknown`, warn developer in profile Structural Notes | None |
| Developer declines to answer ambiguity question | Set `UI Layer` to `unknown` | None |

## Acceptance Criteria
- [ ] AC-1: `onboard-agent.md` contains a new detection phase between Phase 2 and Phase 3 that scans for frontend frameworks and E2E frameworks
- [ ] AC-2: `project-profile-template.md` Tech Stack table includes rows for UI Layer, Frontend Framework, E2E Framework, and E2E Ready
- [ ] AC-3: The onboard-agent contains the explicit allowlist of frontend framework package names (BR-2)
- [ ] AC-4: The onboard-agent contains the explicit allowlist of E2E framework package names (BR-3)
- [ ] AC-5: The onboard-agent includes logic to check for E2E config files (`playwright.config.*`, `cypress.config.*`)
- [ ] AC-6: The onboard-agent includes a developer question for ambiguous UI detection (HTML/template files present but no framework)
- [ ] AC-7: The onboard-agent handles greenfield projects by defaulting to `unknown`
- [ ] AC-8: `plugins/dark-factory/agents/onboard-agent.md` is byte-identical to `.claude/agents/onboard-agent.md`
- [ ] AC-9: `plugins/dark-factory/templates/project-profile-template.md` is byte-identical to `dark-factory/templates/project-profile-template.md`
- [ ] AC-10: The new detection phase runs NO install commands or external processes

## Edge Cases
- EC-1: Project has `react` in devDependencies only (not dependencies) -- MUST still detect it. Many projects put React in devDependencies for SSR/build tooling.
- EC-2: Project has `@playwright/test` installed but no `playwright.config.*` file -- E2E Framework = `Playwright`, E2E Ready = `no`.
- EC-3: Project has `playwright.config.ts` but `@playwright/test` is not in package.json (global install) -- E2E Framework = `Playwright` (inferred from config), E2E Ready = `yes` (config presence is sufficient when config exists).
- EC-4: Monorepo with multiple `package.json` files -- scan root `package.json` only. Monorepo sub-package detection is out of scope.
- EC-5: Project uses Yarn PnP or pnpm with no `node_modules` -- detection is from `package.json` content, not filesystem, so this is unaffected.
- EC-6: Project has `.tsx` files but no React dependency (could be Preact, Solid, or custom JSX) -- triggers the ambiguity question.
- EC-7: Project has zero `.html`/`.jsx`/`.tsx`/`.vue`/`.svelte` files and no frontend framework dependency -- `UI Layer` = `no` without asking.
- EC-8: Incremental refresh where previous profile had manually-set UI Layer values -- re-detection runs, changes are presented to developer for approval per existing refresh flow.

## Dependencies

None -- this spec is independently implementable.

## Implementation Size Estimate
- **Scope size**: small (4 files: 2 source + 2 plugin mirrors)
- **Suggested parallel tracks**: 1 code-agent
  - Track 1: All four files. The onboard-agent change and template change are tightly coupled (the detection logic references the template fields). Plugin mirrors are simple copies. No benefit from parallelism at this scale.

## Implementation Notes

### Files to modify
1. `.claude/agents/onboard-agent.md` -- Add new Phase 2.5 after "Phase 2: Tech Stack & Dependencies" and before "Phase 3: Architecture & Patterns"
2. `dark-factory/templates/project-profile-template.md` -- Add four new rows to the `## Tech Stack` table
3. `plugins/dark-factory/agents/onboard-agent.md` -- Byte-identical copy of file 1
4. `plugins/dark-factory/templates/project-profile-template.md` -- Byte-identical copy of file 2

### Pattern to follow
The new phase should follow the same structure as existing phases in onboard-agent.md:
- Numbered step within the phase
- Bold step title
- Bulleted sub-steps with specific instructions
- The Serena MCP detection in Phase 2 (step 5) is the closest precedent for "detect a capability and record it in the profile"

### Placement in onboard-agent.md
Insert after line that ends Phase 2 (step 5, Serena MCP detection) and before Phase 3 heading. Use heading `### Phase 2.5: UI Layer & E2E Detection`.

### Template placement
Add the four new rows to the Tech Stack table in `project-profile-template.md`, after the existing rows (after `CI/CD`). Use placeholder syntax consistent with existing rows: `{e.g., yes -- React 18 detected}`.

### Existing test considerations
The existing tests in `dark-factory-setup.test.js` verify that onboard-agent references `project-profile.md` and handles greenfield projects. New tests should verify:
- onboard-agent contains the frontend framework allowlist
- onboard-agent contains the E2E framework allowlist
- onboard-agent references `playwright.config` and `cypress.config`
- project-profile-template contains the four new field names
- Plugin mirrors match source files (already covered by existing mirror consistency tests)

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 | P-01, P-02, H-01, H-07 |
| FR-2 | P-03, P-04, H-02 |
| FR-3 | P-05, H-03, H-04 |
| FR-4 | P-06, H-05, H-06 |
| FR-5 | P-07 |
| FR-6 | P-05, H-03, H-04 |
| FR-7 | H-08 |
| BR-1 | H-07 |
| BR-2 | P-01, P-02 |
| BR-3 | P-03, P-04 |
| BR-4 | H-09 |
| BR-5 | H-10 |
| BR-6 | P-06, H-05, H-06 |
| BR-7 | P-06 |
| BR-8 | P-08 |
| EC-1 | H-01 |
| EC-2 | H-03 |
| EC-3 | H-04 |
| EC-4 | H-11 |
| EC-5 | P-01 (implicit -- detection is from package.json content) |
| EC-6 | H-05 |
| EC-7 | P-09 |
| EC-8 | H-08 |
| EH-1 (no package.json) | H-12 |
| EH-2 (no dependencies) | P-09 |
| EH-3 (malformed package.json) | H-13 |
| EH-4 (developer declines) | H-06 |
| AC-8 | P-10 |
| AC-9 | P-10 |
