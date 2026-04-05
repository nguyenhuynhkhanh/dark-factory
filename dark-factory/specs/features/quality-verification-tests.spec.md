# Feature: quality-verification-tests

## Context
Dark Factory is preparing for an org-model refactoring that will restructure agents, split files, and move content between agent definitions. Currently, the test suite (`tests/dark-factory-setup.test.js`) validates structural integrity (files exist, frontmatter is valid, required phrases appear) but does NOT validate that the output format of one agent matches the input expectations of the next agent in the pipeline. There are also 8 plugin mirror files without parity tests — any drift between source and plugin would go undetected.

These verification tests are the prerequisite safety net for org-model refactoring. Without them, splitting an agent could silently break a downstream handoff, and moving content could desync plugin mirrors without anyone noticing.

## Scope
### In Scope (this spec)
- 30 cross-agent contract tests verifying that the output format of agent N matches the input expectations of agent N+1 across 12 distinct handoffs
- 8 plugin mirror parity tests for the 8 source files currently without mirror assertions
- 5 manifest schema validation tests for the `manifest.json` structure

### Out of Scope (explicitly deferred)
- Instruction coverage tests (fragile, duplicates existing structural tests)
- LLM-based integration tests (expensive, flaky, requires actual Claude execution)
- Golden output comparison (high maintenance burden for low value)
- CI/CD pipeline setup
- Reference test project for end-to-end validation
- Modifying the existing `dark-factory-setup.test.js` file

### Scaling Path
These contract tests form the foundation for a broader contract testing strategy. As the org-model refactoring proceeds (splitting agents, extracting shared modules), new contract tests can be added to cover newly-introduced handoff boundaries. The test file structure supports adding new `describe()` blocks for each new contract without touching existing tests.

## Requirements
### Functional

- FR-1: Create `tests/dark-factory-contracts.test.js` as a NEW, separate test file — existing tests in `dark-factory-setup.test.js` must not be modified. Rationale: separation of concerns; contract tests have different change triggers than structural tests.
- FR-2: Cross-agent contract tests must verify that output path/format patterns referenced in agent N match the input path/format patterns expected by agent N+1. Rationale: these are the handoffs that break when agents are restructured.
- FR-3: Contract tests must verify that key field names and section headers referenced in producing agents match what consuming agents parse. Rationale: section renames are the most common silent break during refactoring.
- FR-4: Contract tests must verify that information barrier boundaries are respected in handoff instructions. Rationale: barriers are a core safety invariant of the pipeline.
- FR-5: Plugin mirror tests must perform byte-identical comparison (`assert.strictEqual(source, plugin)`) for each of the 8 untested source/plugin pairs. Rationale: any difference means the plugin is stale.
- FR-6: Manifest schema tests must validate the required fields, types, and allowed values for feature entries. Rationale: malformed manifests cause silent failures in orchestration.
- FR-7: All 43 tests must be deterministic — no LLM calls, no randomness, no network access, no filesystem writes. Rationale: tests must be reliable and fast for use as a pre-refactoring gate.

### Non-Functional

- NFR-1: All 43 tests must complete in under 100ms total. Rationale: these run before every refactoring change; slow tests would discourage running them.
- NFR-2: Zero external dependencies — use only `node:test`, `node:assert/strict`, `node:fs`, `node:path`. Rationale: matches existing test conventions and keeps the project dependency-free.
- NFR-3: Helper functions (`readAgent()`, `readSkill()`, `readPlugin()`) should be defined locally in the new file (not imported from the existing test file, which has no exports). Rationale: the existing test file does not export its helpers; duplicating them is simpler than refactoring exports.

## Data Model
No data model changes. This feature only creates a test file that reads existing files.

## Migration & Deployment
N/A — no existing data affected. This creates a new test file; no existing files are modified, no data is stored, no caches are used.

## API Endpoints
None. This is a test-only feature with no API surface.

## Business Rules

- BR-1: Each cross-agent contract test must verify BOTH directions of a handoff — the producer's output format AND the consumer's input expectation — by checking that the same path pattern, section header, or field name appears in both files. Rationale: a one-sided check only proves the string exists, not that both sides agree.
- BR-2: Plugin mirror tests must use `assert.strictEqual(source, plugin)` (byte-identical) rather than content-matching. Rationale: even whitespace differences could indicate stale copies that would behave differently under LLM interpretation.
- BR-3: Manifest schema tests must validate against a manifest with actual feature entries (not just the empty `{ "version": 1, "features": {} }` structure). Rationale: the empty manifest trivially passes; we need to verify field-level constraints.
- BR-4: Contract tests must NOT test the content/behavior of agents themselves (that is the structural test file's job) — only the consistency of handoff interfaces between them. Rationale: avoids duplicating existing structural tests and keeps the contract tests focused.
- BR-5: Information barrier contract tests must verify that the orchestrator's handoff instructions explicitly exclude forbidden content types. Rationale: barrier violations are the highest-severity contract breaks.

## Error Handling
| Scenario | Response | Side Effects |
|----------|----------|--------------|
| Source agent file missing | Test fails with descriptive `assert.ok(fs.existsSync(...))` | None |
| Plugin mirror file missing | Test fails with descriptive path in error message | None |
| Manifest file missing or invalid JSON | Test fails with parse error | None |
| Test file itself has syntax error | Node test runner reports parse error | None |

## Acceptance Criteria

- [ ] AC-1: `node --test tests/dark-factory-contracts.test.js` runs 43 tests and all pass
- [ ] AC-2: Tests complete in under 100ms
- [ ] AC-3: No modifications to `tests/dark-factory-setup.test.js`
- [ ] AC-4: No external dependencies added
- [ ] AC-5: Each of the 12 contract handoffs has 2-3 assertions verifying both sides
- [ ] AC-6: All 8 missing plugin mirrors are covered by byte-identical assertions
- [ ] AC-7: Manifest schema tests validate field presence, types, and allowed values
- [ ] AC-8: All tests are deterministic (repeated runs produce identical results)

## Edge Cases

- EC-1: A contract test references a section header that exists in the agent but with slightly different casing — test should use exact-match strings found in the actual files, not assumed casing. Expected behavior: test passes because it uses the actual strings from the codebase.
- EC-2: Plugin mirror file has trailing whitespace difference from source — `assert.strictEqual` catches this and fails the test. Expected behavior: test failure with clear message identifying which plugin is stale.
- EC-3: Manifest `features` object is empty (no active features) — manifest schema structural tests should still validate the top-level schema (`version`, `features` object existence). Field-level tests for feature entries use a constructed test object, not the live manifest. Expected behavior: all schema tests pass regardless of manifest contents.
- EC-4: A handoff references a path pattern like `dark-factory/specs/features/{name}.spec.md` — the contract test should verify both sides reference the same path pattern (the literal template string), not that an actual file exists at that path. Expected behavior: test verifies string pattern consistency, not file existence.
- EC-5: The `readPlugin()` helper must construct paths using `plugins/dark-factory/agents/` and `plugins/dark-factory/skills/` — not the `.claude/` source paths. Expected behavior: helper reads from the correct plugin directory.

## Dependencies
- **Reads from**: All 7 agent files in `.claude/agents/`, all 8 skill files in `.claude/skills/`, all corresponding plugin files in `plugins/dark-factory/`, and `dark-factory/manifest.json`
- **No writes**: This feature creates one new test file but does not modify any existing files
- **No breaking changes**: Purely additive — a new test file alongside the existing one

## Implementation Size Estimate

- **Scope size**: small (1 file created: `tests/dark-factory-contracts.test.js`)
- **Estimated file count**: 1
- **Suggested parallel tracks**: 1 code-agent. The entire feature is a single test file with no external dependencies or file overlap concerns.

## Implementation Notes

### Test file structure
Follow the pattern established in `tests/dark-factory-setup.test.js`:
- Use `const { describe, it } = require("node:test");` and `const assert = require("node:assert/strict");`
- Use `const fs = require("fs");` and `const path = require("path");`
- Define `ROOT`, `AGENTS_DIR`, `SKILLS_DIR` constants identically to the existing file
- Define `readAgent(name)`, `readSkill(name)` helpers locally (same implementation as existing file)
- Add `readPlugin(type, name)` helper where type is "agents" or "skills" and name is the file/directory name
- Group tests into `describe()` blocks by contract category

### Contract test organization
Organize the 12 handoffs into logical `describe()` blocks:
1. **Intake pipeline contracts** (handoffs 1-2): df-intake -> spec-agent
2. **Debug pipeline contracts** (handoffs 3-4): df-debug -> debug-agent
3. **Orchestration contracts** (handoffs 5-8): df-orchestrate -> architect/code/test/promote agents
4. **Architect iteration contract** (handoff 6): architect-agent -> spec-agent
5. **Onboard pipeline contracts** (handoff 10): onboard-agent -> scanner-agents
6. **Wave execution contracts** (handoff 11): orchestrator -> wave-agent
7. **Promote/cleanup contracts** (handoff 12): promote-agent -> df-cleanup

### Specific contract verification patterns
For each handoff, the test should:
1. Read both the producing agent/skill and the consuming agent/skill
2. Assert that specific path patterns, section headers, or field names appear in BOTH
3. For information barriers: assert that the producing side's handoff instructions explicitly EXCLUDE forbidden content

### The 12 handoffs and their key assertions

**Handoff 1: df-intake -> spec-agent (perspective assignment)**
- df-intake references "Lead A", "Lead B", "Lead C" with perspective labels
- df-intake spawns `spec-agent` (verify `spec-agent` or `spec-agent.md` reference)
- Perspectives use specific section headers that the synthesis step expects

**Handoff 2: df-intake -> spec-agent (writer phase)**
- df-intake tells the writer to write spec to `dark-factory/specs/features/{name}.spec.md`
- df-intake tells the writer to write scenarios to `dark-factory/scenarios/public/{name}/` and `dark-factory/scenarios/holdout/{name}/`
- spec-agent's output template matches these paths

**Handoff 3: df-debug -> debug-agent (investigator assignment)**
- df-debug references "Investigator A", "Investigator B", "Investigator C"
- df-debug spawns `debug-agent` (verify reference)
- Each investigator has required output sections that synthesis expects

**Handoff 4: df-debug -> debug-agent (writer phase)**
- df-debug tells writer to output to `dark-factory/specs/bugfixes/{name}.spec.md`
- df-debug tells writer to output scenarios to `dark-factory/scenarios/public/{name}/` and `dark-factory/scenarios/holdout/{name}/`

**Handoff 5: df-orchestrate -> architect-agent**
- df-orchestrate references `architect-agent.md`
- df-orchestrate passes spec path and domain parameter
- architect-agent outputs review file to `{name}.review.md` or `{name}.review-{domain-slug}.md`
- df-orchestrate reads review file and checks for APPROVED/BLOCKED

**Handoff 6: architect-agent -> spec-agent (iteration)**
- architect-agent references spawning `spec-agent` for features
- architect-agent references spawning `debug-agent` for bugfixes
- architect-agent passes "findings" to spec-agent
- spec-agent process includes handling architect feedback (re-spawn phase)

**Handoff 7: df-orchestrate -> code-agent**
- df-orchestrate passes spec content and public scenarios to code-agent
- df-orchestrate passes architect findings: "Key Decisions Made" and "Remaining Notes"
- code-agent expects: spec, public scenarios, architect review findings
- code-agent references track assignment format

**Handoff 8: df-orchestrate -> test-agent**
- df-orchestrate passes feature name and spec path to test-agent
- test-agent reads holdout scenarios from `dark-factory/scenarios/holdout/{feature}/`
- test-agent writes results to `dark-factory/results/{feature}/`

**Handoff 9: df-orchestrate -> promote-agent**
- df-orchestrate passes feature name and results path
- promote-agent reads from `dark-factory/results/{name}/`
- promote-agent writes registry to `dark-factory/promoted-tests.json`

**Handoff 10: onboard-agent -> scanner-agents**
- onboard-agent references spawning scanner agents
- onboard-agent defines directory chunk format for scanners
- onboard-agent defines output report structure scanners must follow

**Handoff 11: orchestrator -> wave-agent**
- df-orchestrate passes spec names, branch, and mode to wave agents
- Wave agents handle full lifecycle (architect, code, holdout, promote, cleanup)
- Wave agent returns structured results with per-spec status

**Handoff 12: promote-agent -> df-cleanup**
- promote-agent uses `DF-PROMOTED-START`/`DF-PROMOTED-END` annotations
- df-cleanup scans for these exact annotation strings
- promote-agent writes to `promoted-tests.json`
- df-cleanup reads `promoted-tests.json` and validates schema

### Plugin mirror pairs (8 tests)
| Source | Plugin |
|--------|--------|
| `.claude/agents/architect-agent.md` | `plugins/dark-factory/agents/architect-agent.md` |
| `.claude/agents/spec-agent.md` | `plugins/dark-factory/agents/spec-agent.md` |
| `.claude/agents/debug-agent.md` | `plugins/dark-factory/agents/debug-agent.md` |
| `.claude/agents/test-agent.md` | `plugins/dark-factory/agents/test-agent.md` |
| `.claude/skills/df-onboard/SKILL.md` | `plugins/dark-factory/skills/df-onboard/SKILL.md` |
| `.claude/skills/df-scenario/SKILL.md` | `plugins/dark-factory/skills/df-scenario/SKILL.md` |
| `.claude/skills/df-spec/SKILL.md` | `plugins/dark-factory/skills/df-spec/SKILL.md` |
| `.claude/skills/df/SKILL.md` | `plugins/dark-factory/skills/df/SKILL.md` |

### Manifest schema test data
The manifest schema tests should construct a test manifest object with a feature entry and validate:
1. Required fields: `type`, `status`, `specPath`, `created`, `rounds`, `group`, `dependencies`
2. `group` is string or null (never undefined/missing)
3. `dependencies` is an array (never undefined/missing)
4. `status` is one of: `"active"`, `"passed"`, `"promoted"`
5. `version` field at the top level is `1`

## Traceability
| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 | P-01, H-01 |
| FR-2 | P-02, P-03, P-04, P-05, H-02, H-03 |
| FR-3 | P-02, P-03, P-04, P-05, H-04 |
| FR-4 | P-06, H-05 |
| FR-5 | P-07, H-06, H-07 |
| FR-6 | P-08, H-08, H-09 |
| FR-7 | P-09, H-10 |
| BR-1 | P-02, P-03, P-04, P-05, H-02, H-03 |
| BR-2 | P-07, H-06, H-07 |
| BR-3 | P-08, H-08, H-09 |
| BR-4 | H-11 |
| BR-5 | P-06, H-05 |
| EC-1 | H-04 |
| EC-2 | H-07 |
| EC-3 | H-08 |
| EC-4 | H-02 |
| EC-5 | H-12 |
| NFR-1 | P-09 |
| NFR-2 | P-01, H-01 |
| NFR-3 | H-12 |
