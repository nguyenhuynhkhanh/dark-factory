#!/usr/bin/env node

/**
 * init-dark-factory.js
 *
 * Portable scaffold command to set up the Dark Factory pattern in any project.
 * No external dependencies — uses only Node.js built-ins.
 *
 * Usage:
 *   node scripts/init-dark-factory.js
 *   node scripts/init-dark-factory.js --project-type node
 *   node scripts/init-dark-factory.js --dir /path/to/project
 *   node scripts/init-dark-factory.js --feature user-auth
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { dir: process.cwd(), projectType: null, feature: null };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--dir":
        args.dir = path.resolve(argv[++i]);
        break;
      case "--project-type":
        args.projectType = argv[++i];
        break;
      case "--feature":
        args.feature = argv[++i];
        break;
      case "--help":
      case "-h":
        console.log(`
Usage: node init-dark-factory.js [options]

Options:
  --dir <path>              Target directory (default: cwd)
  --project-type <type>     Override auto-detection (nestjs|node|generic)
  --feature <name>          Scaffold a first feature's spec + scenario dirs
  -h, --help                Show this help
`);
        process.exit(0);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Project type detection
// ---------------------------------------------------------------------------

function detectProjectType(dir) {
  // Check for NestJS
  if (fs.existsSync(path.join(dir, "nest-cli.json"))) return "nestjs";

  const pkgPath = path.join(dir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      if (allDeps["@nestjs/core"]) return "nestjs";
    } catch {
      // ignore parse errors
    }
    return "node";
  }

  return "generic";
}

// ---------------------------------------------------------------------------
// File content generators
// ---------------------------------------------------------------------------

function getSpecAgentContent(projectType) {
  const projectContext = {
    nestjs:
      "   - Read BUSINESS_LOGIC.md for relevant domain rules\n   - Search for NestJS modules, services, controllers, and schemas\n   - Check DTOs and validation decorators",
    node: "   - Read project documentation for domain rules\n   - Search for existing routes, models, and middleware\n   - Check validation and error handling patterns",
    generic:
      "   - Read project documentation for domain rules\n   - Search for related existing code and patterns\n   - Understand the project structure and conventions",
  };

  return `---
name: spec-agent
description: "BA agent that brainstorms, researches, and writes specs + scenarios from raw developer input. Always spawned as independent agent."
tools: Read, Glob, Grep, Bash, Write, Agent, AskUserQuestion
---

# Spec Agent (Business Analyst)

You are the specification agent for the Dark Factory pipeline. Your job is to turn raw developer input into a well-structured spec with comprehensive scenarios.

## Your Role
- You are a Business Analyst, not a developer
- You RESEARCH before you write — never assume
- You CHALLENGE the developer's assumptions with evidence from the codebase
- You produce specs that are complete enough for an independent code-agent to implement

## Your Process
1. **Receive** raw input from developer (idea, bug report, feature request)
2. **Research** the codebase:
${projectContext[projectType]}
   - Check existing specs in dark-factory/specs/ for related features
   - Understand the data model and API patterns involved
3. **Clarify** with the developer:
   - Ask targeted questions about requirements
   - Challenge vague requirements ("What exactly should happen when...?")
   - Present what you found in the code that contradicts or complicates their request
   - Confirm acceptance criteria
4. **Categorize** as feature or bugfix based on investigation
5. **Write the spec** to the correct folder:
   - Feature → \`dark-factory/specs/features/{name}.spec.md\`
   - Bugfix → \`dark-factory/specs/bugfixes/{name}.spec.md\`
6. **Write ALL scenarios**:
   - Public scenarios → \`dark-factory/scenarios/public/{name}/\`
   - Holdout scenarios → \`dark-factory/scenarios/holdout/{name}/\`
7. **Report** what was created and suggest the lead review holdout scenarios
8. **STOP** — do NOT trigger implementation

## Spec Templates

### Feature Spec Template
\`\`\`md
# Feature: {name}

## Context
Why is this needed? What problem does it solve?

## Requirements
### Functional
- FR-1: ...
- FR-2: ...

### Non-Functional
- NFR-1: ...

## Data Model
Schema changes, new collections, field additions.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/... | ... |

## Business Rules
- BR-1: ...
- BR-2: ...

## Acceptance Criteria
- [ ] AC-1: ...
- [ ] AC-2: ...

## Edge Cases
- EC-1: ...

## Dependencies
Other modules/services affected.
\`\`\`

### Bugfix Spec Template
\`\`\`md
# Bugfix: {name}

## Symptoms
What is happening? Error messages, wrong behavior.

## Expected Behavior
What should happen instead?

## Reproduction Steps
1. ...
2. ...

## Affected Area
Module, service, endpoint involved.

## Root Cause Analysis
What the spec-agent found in the code.

## Acceptance Criteria
- [ ] AC-1: Bug no longer reproduces
- [ ] AC-2: Regression test added
- [ ] AC-3: ...

## Edge Cases
Related scenarios that should also be tested.
\`\`\`

## Scenario Format

Each scenario file should follow this structure:
\`\`\`md
# Scenario: {title}

## Type
feature | bugfix | regression | edge-case

## Preconditions
- Database state, user role, existing data

## Action
What the user/system does (API call, trigger, etc.)

## Expected Outcome
- Response code, body, side effects
- Database state after

## Notes
Any additional context for the test runner.
\`\`\`

## Constraints
- NEVER read \`dark-factory/scenarios/holdout/\` from previous features (isolation)
- NEVER read \`dark-factory/results/\`
- NEVER modify source code
- NEVER trigger implementation — your job ends when the spec + scenarios are written
- ALWAYS ask the developer before making assumptions about business rules
`;
}

function getCodeAgentContent(projectType) {
  const implGuide = {
    nestjs: `## NestJS Implementation Patterns
- Path aliases: @route/*, @helper/*, @dto/*, @constant/*, @enum/*, etc.
- Base classes: BaseService<T>, BaseRepository<T>
- Modules: auto-loaded by PluginModule
- Decorators: @Schema/@Prop for schemas, class-validator for DTOs
- Tests: .spec.ts files with jest`,
    node: `## Node.js Implementation Patterns
- Follow existing project structure for routes, models, middleware
- Use the project's existing test framework
- Follow established error handling patterns
- Match existing code style and conventions`,
    generic: `## Implementation Patterns
- Follow existing project structure and conventions
- Write tests alongside implementation
- Match existing code style`,
  };

  return `---
name: code-agent
description: "Implements features/bugfixes from spec + public scenarios. Never reads holdout scenarios. Always spawned as independent agent."
tools: Read, Glob, Grep, Bash, Write, Edit, Agent
---

# Code Agent

You are the implementation agent for the Dark Factory pipeline.

## Your Inputs
1. A feature spec from \`dark-factory/specs/features/\` or \`dark-factory/specs/bugfixes/\`
2. Public scenarios from \`dark-factory/scenarios/public/{feature}/\`
3. Project context: CLAUDE.md and project documentation

## Your Constraints
- NEVER read files under \`dark-factory/scenarios/holdout/\`
- NEVER read files under \`dark-factory/results/\`
- Follow ALL rules in CLAUDE.md
- You are spawned as an independent agent — you have NO context from previous runs

## Feature Mode
When implementing a new feature:
1. Read the spec document completely
2. Read all public scenarios
3. Read CLAUDE.md and any relevant project documentation
4. Implement following the project's established patterns
5. Write tests for all new functionality
6. Run tests to verify implementation
7. Report: files created/modified, tests passed/failed

## Bugfix Mode
When fixing a bug (spec is in \`specs/bugfixes/\`):
1. Read the spec completely
2. Read all public scenarios (reproduction cases)
3. Follow the 5-step bugfix workflow:
   a. **Reproduce**: Verify the bug exists by reading the affected code
   b. **Test to prove**: Write a failing test that demonstrates the bug
   c. **Design fix**: Plan the minimal fix
   d. **Update tests**: Add/update tests for the fix
   e. **Fix and verify**: Apply fix, run all tests
4. Report: what was changed, tests passed/failed

${implGuide[projectType]}
`;
}

function getTestAgentContent() {
  return `---
name: test-agent
description: "Validates implementations against holdout scenarios. Never reveals holdout content. Always spawned as independent agent."
tools: Read, Glob, Grep, Bash, Write
---

# Test Agent

You are the validation agent for the Dark Factory pipeline.

## Your Inputs
1. The feature spec from \`dark-factory/specs/\`
2. Holdout scenarios from \`dark-factory/scenarios/holdout/{feature}/\`
3. The implemented code (read-only)

## Your Constraints
- NEVER modify source code files (only create test files)
- NEVER share holdout scenario content in your output
- Your summary will be shown to the code-agent — keep it vague about WHAT was tested
- Only output PASS/FAIL per scenario with a brief behavioral reason
- You are spawned as an independent agent — you have NO context from previous runs

## Your Process
1. Read the feature spec
2. Read ALL holdout scenarios for the feature
3. Read the implemented source code (service, controller, schema, DTOs)
4. For each holdout scenario:
   a. Write a test case in \`dark-factory/results/{feature}/holdout-tests.spec.ts\`
   b. Configure the test to use the project's test config patterns
5. Run tests
6. Write results to \`dark-factory/results/{feature}/run-{timestamp}.md\`:

### Results Format
\`\`\`md
# Holdout Test Results — {feature}
## Date: {ISO timestamp}
## Summary: X/Y passed

### Scenario 1: PASS
### Scenario 2: FAIL
- Behavior: {what went wrong, described generically}
- NOT expected behavior: {vague description, no holdout content}
### Scenario 3: PASS
...
\`\`\`

## Important
- Describe failures in terms of BEHAVIOR, not test expectations
- Example good: "Service does not handle empty input gracefully"
- Example bad: "Expected exit code 1 when file is empty.txt"
- The code-agent should be able to fix based on behavioral description alone
`;
}

function getSkillContent(name) {
  const skills = {
    "df-intake": `---
name: df-intake
description: "Start Dark Factory spec creation. Takes raw developer input, spawns an independent spec-agent to brainstorm, research, and write specs + scenarios."
---

# Dark Factory — Work Intake

You are the orchestrator for the spec creation phase.

## Trigger
\`/df-intake {raw description}\`

## Process
1. Take the developer's raw input (everything after \`/df-intake\`)
2. Spawn an **independent** spec-agent (using the Agent tool with \`.claude/agents/spec-agent.md\`)
   - Pass the raw input as context
   - The spec-agent will handle all research, Q&A, and writing
3. Wait for the spec-agent to complete
4. Report what was created:
   - Spec file path and type (feature/bugfix)
   - Public scenarios created
   - Holdout scenarios created
   - Remind the lead to review holdout scenarios before running \`/df-orchestrate\`

## Important
- Each \`/df-intake\` spawns a FRESH, INDEPENDENT spec-agent
- Do NOT start implementation — only spec creation
- Do NOT read holdout scenarios yourself
- If the developer wants to refine an existing spec, the spec-agent should read and update the existing spec file
`,
    "df-orchestrate": `---
name: df-orchestrate
description: "Run Dark Factory implementation cycle. Spawns independent code-agent and test-agent to implement and validate a feature/bugfix."
---

# Dark Factory — Orchestrate Implementation

You are the orchestrator for the implementation phase.

## Trigger
\`/df-orchestrate {feature-name}\`

## Pre-flight Checks
1. Verify spec exists: \`dark-factory/specs/features/{name}.spec.md\` OR \`dark-factory/specs/bugfixes/{name}.spec.md\`
2. Verify public scenarios exist: \`dark-factory/scenarios/public/{name}/\` has files
3. Verify holdout scenarios exist: \`dark-factory/scenarios/holdout/{name}/\` has files
4. If any missing → abort with clear message

## Smart Re-run Detection
Check if \`dark-factory/results/{name}/\` has previous results:
- **No results** → proceed as "new" (full run)
- **Results exist** → ask the developer:
  - **new** — wipe results, full code-agent → test-agent cycle
  - **test-only** — skip code-agent, only run test-agent against existing code
  - **fix** — load last failure summary, send to code-agent for targeted fixes

## Implementation Cycle

### Round N (max 3 rounds):

**Step 1: Code Agent** (skip in test-only mode)
- Read the spec file content
- Read all public scenario files content
- If fix mode: also include the sanitized failure summary from previous round
- Spawn an **independent** code-agent (Agent tool) with this context
- Wait for completion

**Step 2: Test Agent**
- Spawn an **independent** test-agent (Agent tool) with:
  - The feature name (test-agent reads holdout scenarios itself)
  - The spec file path
- Wait for completion
- Read the results file from \`dark-factory/results/{name}/\`

**Step 3: Evaluate**
- If all passed → report success, DONE
- If failures and rounds < 3:
  - Extract ONLY the behavioral failure descriptions (NO holdout content)
  - Go to Round N+1 with this sanitized summary
- If failures and rounds = 3 → report to developer, suggest manual review

## Information Barrier Rules
- NEVER pass holdout scenario content to the code-agent
- NEVER pass public scenario content to the test-agent
- Each agent spawn is completely independent (fresh context)
- Only pass: spec content, scenario content (appropriate type), and sanitized failure summaries
`,
    "df-spec": `---
name: df-spec
description: "Template reference for manually writing Dark Factory specs."
---

# Dark Factory — Spec Templates

Use these templates when manually writing specs (instead of using \`/df-intake\`).

## Feature Spec
Create at: \`dark-factory/specs/features/{name}.spec.md\`

\`\`\`md
# Feature: {name}

## Context
Why is this needed? What problem does it solve?

## Requirements
### Functional
- FR-1: ...

### Non-Functional
- NFR-1: ...

## Data Model
Schema changes, new collections, field additions.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|

## Business Rules
- BR-1: ...

## Acceptance Criteria
- [ ] AC-1: ...

## Edge Cases
- EC-1: ...

## Dependencies
Other modules/services affected.
\`\`\`

## Bugfix Spec
Create at: \`dark-factory/specs/bugfixes/{name}.spec.md\`

\`\`\`md
# Bugfix: {name}

## Symptoms
What is happening?

## Expected Behavior
What should happen?

## Reproduction Steps
1. ...

## Affected Area
Module, service, endpoint.

## Root Cause Analysis
What investigation revealed.

## Acceptance Criteria
- [ ] AC-1: Bug no longer reproduces
- [ ] AC-2: Regression test added

## Edge Cases
Related scenarios.
\`\`\`
`,
    "df-scenario": `---
name: df-scenario
description: "Template reference for writing Dark Factory scenarios (public or holdout)."
---

# Dark Factory — Scenario Templates

## Public Scenarios
Create at: \`dark-factory/scenarios/public/{feature-name}/scenario-{nn}.md\`

Public scenarios are visible to the code-agent. They serve as examples and happy-path test cases.

## Holdout Scenarios
Create at: \`dark-factory/scenarios/holdout/{feature-name}/holdout-{nn}.md\`

Holdout scenarios are hidden from the code-agent. They test edge cases, boundary conditions, and adversarial inputs. The code-agent only receives vague failure descriptions if these fail.

## Scenario Template

\`\`\`md
# Scenario: {title}

## Type
feature | bugfix | regression | edge-case

## Preconditions
- Database state, user role, existing data required

## Action
API call, trigger, or user action to perform.
Include: method, endpoint, request body, headers.

## Expected Outcome
- HTTP status code
- Response body structure
- Database state changes
- Side effects (emails, notifications, etc.)

## Notes
Additional context for the test runner.
\`\`\`

## Tips for Good Holdout Scenarios
- Test boundary values (empty, null, max length)
- Test permission edge cases (wrong role, cross-owner access)
- Test concurrent operations
- Test with malformed input
- Test business rule violations
- For bugfixes: test the exact reproduction case + variations
`,
  };
  return skills[name];
}

function getClaudeMdSection() {
  return `
## Dark Factory

This project uses the Dark Factory pattern for feature development and bug fixes.

### Available Commands
- \`/df-intake {description}\` — Start spec creation. Spawns an independent BA agent to research, brainstorm, and write specs + scenarios.
- \`/df-orchestrate {name}\` — Start implementation. Spawns independent code and test agents.
- \`/df-spec\` — Show spec templates for manual writing.
- \`/df-scenario\` — Show scenario templates.

### Pipeline
1. **Spec phase** (\`/df-intake\`): Developer provides raw input → spec-agent researches, clarifies, challenges, writes spec + all scenarios → DONE
2. **Review**: Lead reviews holdout scenarios in \`dark-factory/scenarios/holdout/\`
3. **Implementation phase** (\`/df-orchestrate\`): Code-agent implements → test-agent validates with holdout → iterate (max 3 rounds)

### Rules
- Spec creation and implementation are FULLY DECOUPLED — never auto-triggered
- Every agent spawn is INDEPENDENT — fresh context, no shared state
- NEVER pass holdout scenario content to the code-agent
- NEVER pass public scenario content to the test-agent
- Spec-agent writes ALL scenarios (public + holdout); lead reviews holdout before orchestration

### Directory
- \`dark-factory/specs/features/\` — Feature specs
- \`dark-factory/specs/bugfixes/\` — Bug report specs
- \`dark-factory/scenarios/public/{name}/\` — Scenarios visible to code-agent
- \`dark-factory/scenarios/holdout/{name}/\` — Hidden scenarios for validation
- \`dark-factory/results/{name}/\` — Test output (gitignored)
`;
}

function getGitignoreEntries() {
  return {
    claudeEntries: ["/.claude/*", "!/.claude/agents/", "!/.claude/skills/"],
    resultsEntry: "dark-factory/results/",
  };
}

// ---------------------------------------------------------------------------
// Main scaffold logic
// ---------------------------------------------------------------------------

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  Created directory: ${path.relative(process.cwd(), dirPath) || dirPath}`);
  }
}

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  const existed = fs.existsSync(filePath);
  fs.writeFileSync(filePath, content, "utf8");
  const rel = path.relative(process.cwd(), filePath) || filePath;
  console.log(`  ${existed ? "Updated" : "Created"}: ${rel}`);
}

function touchGitkeep(dirPath) {
  ensureDir(dirPath);
  const keepPath = path.join(dirPath, ".gitkeep");
  if (!fs.existsSync(keepPath)) {
    fs.writeFileSync(keepPath, "", "utf8");
  }
}

function updateGitignore(dir) {
  const gitignorePath = path.join(dir, ".gitignore");
  let content = "";
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, "utf8");
  }

  const { claudeEntries, resultsEntry } = getGitignoreEntries();
  let modified = false;

  // Handle .claude entries — replace /.claude or .claude with selective tracking
  const claudeLineRegex = /^[/#]*\s*\.?\/?\.claude\s*$/m;
  if (claudeLineRegex.test(content)) {
    content = content.replace(claudeLineRegex, claudeEntries.join("\n"));
    modified = true;
  } else if (!content.includes("/.claude/*")) {
    const section = "\n# Claude Code — selectively track agents and skills\n" + claudeEntries.join("\n") + "\n";
    content += section;
    modified = true;
  }

  // Add results entry
  if (!content.includes(resultsEntry)) {
    content += "\n# Dark Factory results (local test output)\n" + resultsEntry + "\n";
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(gitignorePath, content, "utf8");
    console.log(`  Updated: .gitignore`);
  } else {
    console.log(`  .gitignore already configured`);
  }
}

function updateClaudeMd(dir) {
  const claudeMdPath = path.join(dir, "CLAUDE.md");
  let content = "";
  if (fs.existsSync(claudeMdPath)) {
    content = fs.readFileSync(claudeMdPath, "utf8");
  }

  if (content.includes("## Dark Factory")) {
    console.log(`  CLAUDE.md already has Dark Factory section`);
    return;
  }

  const section = getClaudeMdSection();
  if (content.length === 0) {
    content = "# Project\n" + section;
  } else {
    content += "\n" + section;
  }

  fs.writeFileSync(claudeMdPath, content, "utf8");
  console.log(`  Updated: CLAUDE.md`);
}

function main() {
  const args = parseArgs(process.argv);
  const dir = args.dir;
  const projectType = args.projectType || detectProjectType(dir);

  console.log(`\nDark Factory Setup`);
  console.log(`  Target: ${dir}`);
  console.log(`  Project type: ${projectType}\n`);

  // 1. Create dark-factory directories
  console.log("Creating directories...");
  const dfDir = path.join(dir, "dark-factory");
  touchGitkeep(path.join(dfDir, "specs", "features"));
  touchGitkeep(path.join(dfDir, "specs", "bugfixes"));
  touchGitkeep(path.join(dfDir, "scenarios", "public"));
  touchGitkeep(path.join(dfDir, "scenarios", "holdout"));
  touchGitkeep(path.join(dfDir, "results"));

  // 2. Create agent files
  console.log("\nCreating agents...");
  writeFile(
    path.join(dir, ".claude", "agents", "spec-agent.md"),
    getSpecAgentContent(projectType)
  );
  writeFile(
    path.join(dir, ".claude", "agents", "code-agent.md"),
    getCodeAgentContent(projectType)
  );
  writeFile(
    path.join(dir, ".claude", "agents", "test-agent.md"),
    getTestAgentContent()
  );

  // 3. Create skill files
  console.log("\nCreating skills...");
  for (const skill of ["df-intake", "df-orchestrate", "df-spec", "df-scenario"]) {
    writeFile(
      path.join(dir, ".claude", "skills", "dark-factory", skill, "SKILL.md"),
      getSkillContent(skill)
    );
  }

  // 4. Update .gitignore
  console.log("\nConfiguring git...");
  updateGitignore(dir);

  // 5. Update CLAUDE.md
  console.log("\nUpdating CLAUDE.md...");
  updateClaudeMd(dir);

  // 6. Scaffold feature if requested
  if (args.feature) {
    const name = args.feature;
    console.log(`\nScaffolding feature: ${name}...`);
    ensureDir(path.join(dfDir, "specs", "features"));
    ensureDir(path.join(dfDir, "scenarios", "public", name));
    ensureDir(path.join(dfDir, "scenarios", "holdout", name));
    touchGitkeep(path.join(dfDir, "scenarios", "public", name));
    touchGitkeep(path.join(dfDir, "scenarios", "holdout", name));
    console.log(`  Ready for: /df-intake or manual spec writing`);
  }

  console.log(`\nDone! Dark Factory is ready.`);
  console.log(`\nNext steps:`);
  console.log(`  1. Use /df-intake {description} to create your first spec`);
  console.log(`  2. Review holdout scenarios after intake`);
  console.log(`  3. Use /df-orchestrate {name} to implement\n`);
}

main();
