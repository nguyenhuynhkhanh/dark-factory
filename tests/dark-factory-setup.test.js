const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "..");
const AGENTS_DIR = path.join(ROOT, ".claude", "agents");
const SKILLS_DIR = path.join(ROOT, ".claude", "skills");
const DF_DIR = path.join(ROOT, "dark-factory");

function readAgent(name) {
  return fs.readFileSync(path.join(AGENTS_DIR, `${name}.md`), "utf8");
}

function readSkill(name) {
  return fs.readFileSync(
    path.join(SKILLS_DIR, name, "SKILL.md"),
    "utf8"
  );
}

/** Parse YAML-ish frontmatter between --- delimiters */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    // strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    fm[key] = value;
  }
  return fm;
}

// ===========================================================================
// 1. Agent files exist with valid frontmatter
// ===========================================================================

describe("Agent definitions", () => {
  const expectedAgents = [
    "spec-agent",
    "debug-agent",
    "onboard-agent",
    "architect-agent",
    "code-agent",
    "test-agent",
    "promote-agent",
  ];

  for (const name of expectedAgents) {
    it(`${name}.md exists`, () => {
      const filePath = path.join(AGENTS_DIR, `${name}.md`);
      assert.ok(fs.existsSync(filePath), `Missing agent file: ${filePath}`);
    });

    it(`${name}.md has valid frontmatter with name, description, tools`, () => {
      const content = readAgent(name);
      const fm = parseFrontmatter(content);
      assert.ok(fm, `${name}.md has no frontmatter`);
      assert.equal(fm.name, name, `Frontmatter name should be "${name}"`);
      assert.ok(fm.description, `${name}.md missing description`);
      assert.ok(fm.tools, `${name}.md missing tools`);
    });
  }
});

// ===========================================================================
// 2. Skill files exist with valid frontmatter
// ===========================================================================

describe("Skill definitions", () => {
  const expectedSkills = [
    "df-onboard",
    "df-intake",
    "df-debug",
    "df-orchestrate",
    "df-spec",
    "df-scenario",
    "df-cleanup",
  ];

  for (const name of expectedSkills) {
    it(`${name}/SKILL.md exists`, () => {
      const filePath = path.join(SKILLS_DIR, name, "SKILL.md");
      assert.ok(fs.existsSync(filePath), `Missing skill file: ${filePath}`);
    });

    it(`${name}/SKILL.md has valid frontmatter with name and description`, () => {
      const content = readSkill(name);
      const fm = parseFrontmatter(content);
      assert.ok(fm, `${name}/SKILL.md has no frontmatter`);
      assert.equal(fm.name, name, `Frontmatter name should be "${name}"`);
      assert.ok(fm.description, `${name}/SKILL.md missing description`);
    });
  }
});

// ===========================================================================
// 3. Dark Factory directory structure
// ===========================================================================

describe("Dark Factory directory structure", () => {
  const requiredDirs = [
    "specs/features",
    "specs/bugfixes",
    "scenarios/public",
    "scenarios/holdout",
    "results",
    "archive",
  ];

  for (const dir of requiredDirs) {
    it(`dark-factory/${dir}/ exists`, () => {
      assert.ok(
        fs.existsSync(path.join(DF_DIR, dir)),
        `Missing directory: dark-factory/${dir}/`
      );
    });
  }

  it("manifest.json exists and is valid JSON", () => {
    const manifestPath = path.join(DF_DIR, "manifest.json");
    assert.ok(fs.existsSync(manifestPath), "manifest.json missing");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.version, 1);
    assert.ok(
      typeof manifest.features === "object",
      "manifest.features should be an object"
    );
  });

  it("manifest.json is NOT in .gitignore", () => {
    const gitignore = fs.readFileSync(
      path.join(ROOT, ".gitignore"),
      "utf8"
    );
    assert.ok(
      !gitignore.includes("manifest.json"),
      "manifest.json should not be gitignored"
    );
  });

  it("dark-factory/results/ IS in .gitignore", () => {
    const gitignore = fs.readFileSync(
      path.join(ROOT, ".gitignore"),
      "utf8"
    );
    assert.ok(
      gitignore.includes("dark-factory/results/"),
      "dark-factory/results/ should be gitignored"
    );
  });
});

// ===========================================================================
// 4. Pipeline routing — df-intake is feature-only, df-debug is bug-only
// ===========================================================================

describe("Pipeline routing", () => {
  it("df-intake redirects bugs to /df-debug", () => {
    const content = readSkill("df-intake");
    assert.ok(
      content.includes("/df-debug"),
      "df-intake should reference /df-debug for bug redirection"
    );
    assert.ok(
      content.toLowerCase().includes("bug"),
      "df-intake should mention bug detection"
    );
  });

  it("df-intake is feature-only", () => {
    const content = readSkill("df-intake");
    assert.match(content, /feature/i, "df-intake should mention features");
    // Should not spawn debug-agent
    assert.ok(
      !content.includes("debug-agent.md"),
      "df-intake should not reference debug-agent.md"
    );
  });

  it("df-debug spawns debug-agent (not spec-agent)", () => {
    const content = readSkill("df-debug");
    assert.ok(
      content.includes("debug-agent"),
      "df-debug should reference debug-agent"
    );
    assert.ok(
      !content.includes("spec-agent"),
      "df-debug should not reference spec-agent"
    );
  });

  it("spec-agent is feature-only and redirects bugs", () => {
    const content = readAgent("spec-agent");
    assert.ok(
      content.includes("Features Only") || content.includes("FEATURES only"),
      "spec-agent should declare it handles features only"
    );
    assert.ok(
      content.includes("/df-debug"),
      "spec-agent should redirect bugs to /df-debug"
    );
  });

  it("df-orchestrate detects feature vs bugfix mode", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Feature mode") || content.includes("feature mode"),
      "df-orchestrate should reference feature mode"
    );
    assert.ok(
      content.includes("Bugfix mode") || content.includes("bugfix mode") || content.includes("Bugfix Mode"),
      "df-orchestrate should reference bugfix mode"
    );
  });
});

// ===========================================================================
// 5. Architect review gate
// ===========================================================================

describe("Architect review gate", () => {
  it("df-orchestrate includes mandatory architect review", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Architect Review") || content.includes("architect-agent"),
      "df-orchestrate should include architect review step"
    );
  });

  it("df-orchestrate references architect-agent.md", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("architect-agent.md"),
      "df-orchestrate should reference architect-agent.md"
    );
  });

  it("architect-agent runs minimum 3 rounds", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("minimum 3") || content.includes("at least 3"),
      "architect-agent should specify minimum 3 rounds"
    );
  });

  it("architect-agent references spec-agent for features", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("spec-agent"),
      "architect-agent should reference spec-agent for feature reviews"
    );
  });

  it("architect-agent references debug-agent for bugfixes", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("debug-agent"),
      "architect-agent should reference debug-agent for bugfix reviews"
    );
  });

  it("architect-agent produces APPROVED/BLOCKED status", () => {
    const content = readAgent("architect-agent");
    assert.ok(content.includes("APPROVED"), "Should mention APPROVED status");
    assert.ok(content.includes("BLOCKED"), "Should mention BLOCKED status");
  });

  it("df-orchestrate blocks implementation when architect returns BLOCKED", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("BLOCKED") &&
        content.toLowerCase().includes("do not proceed"),
      "df-orchestrate should block implementation on BLOCKED status"
    );
  });
});

// ===========================================================================
// 6. Information barriers
// ===========================================================================

describe("Information barriers", () => {
  it("code-agent cannot read holdout scenarios", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("NEVER read") &&
        content.includes("holdout"),
      "code-agent must have holdout read prohibition"
    );
  });

  it("code-agent cannot read results", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("NEVER read") &&
        content.includes("results"),
      "code-agent must have results read prohibition"
    );
  });

  it("test-agent cannot modify source code", () => {
    const content = readAgent("test-agent");
    assert.ok(
      content.includes("NEVER modify source"),
      "test-agent must have source code modification prohibition"
    );
  });

  it("test-agent cannot share holdout content", () => {
    const content = readAgent("test-agent");
    assert.ok(
      content.includes("NEVER share holdout"),
      "test-agent must not share holdout content"
    );
  });

  it("spec-agent cannot read holdout from previous features", () => {
    const content = readAgent("spec-agent");
    assert.ok(
      content.includes("NEVER read") &&
        content.includes("holdout"),
      "spec-agent must not read previous holdout scenarios"
    );
  });

  it("spec-agent cannot modify source code", () => {
    const content = readAgent("spec-agent");
    assert.ok(
      content.includes("NEVER modify source code"),
      "spec-agent must not modify source code"
    );
  });

  it("debug-agent cannot modify source code", () => {
    const content = readAgent("debug-agent");
    assert.ok(
      content.includes("NEVER modify source code"),
      "debug-agent must not modify source code"
    );
  });

  it("architect-agent has ZERO access to scenarios", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("ZERO access to scenarios"),
      "architect-agent must have zero scenario access"
    );
  });

  it("architect-agent NEVER discusses tests with spec/debug agents", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("NEVER discuss") &&
        content.toLowerCase().includes("test"),
      "architect-agent must never discuss tests"
    );
  });

  it("architect-agent NEVER asks agents to update scenarios", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("NEVER ask") &&
        content.toLowerCase().includes("scenario"),
      "architect-agent must never request scenario updates"
    );
  });

  it("promote-agent cannot modify source code", () => {
    const content = readAgent("promote-agent");
    assert.ok(
      content.includes("NEVER modify source code"),
      "promote-agent must not modify source code"
    );
  });

  it("df-orchestrate enforces all information barriers", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("NEVER pass holdout") &&
        content.includes("code-agent"),
      "Must prohibit passing holdout to code-agent"
    );
    assert.ok(
      content.includes("NEVER pass") &&
        content.includes("test-agent"),
      "Must prohibit passing public to test-agent"
    );
    assert.ok(
      content.includes("NEVER pass") &&
        content.includes("architect-agent"),
      "Must prohibit passing test content to architect-agent"
    );
  });
});

// ===========================================================================
// 7. Project onboarding
// ===========================================================================

describe("Project onboarding", () => {
  it("onboard-agent writes only to project-profile.md", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("project-profile.md"),
      "onboard-agent should reference project-profile.md"
    );
    assert.ok(
      content.includes("NEVER modify source code"),
      "onboard-agent must not modify source code"
    );
  });

  it("df-onboard skill spawns onboard-agent", () => {
    const content = readSkill("df-onboard");
    assert.ok(
      content.includes("onboard-agent"),
      "df-onboard should reference onboard-agent"
    );
  });

  it("onboard-agent handles greenfield projects", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.toLowerCase().includes("greenfield") ||
        content.toLowerCase().includes("empty"),
      "onboard-agent should handle empty/greenfield projects"
    );
  });

  it("onboard-agent handles existing profiles (refresh check)", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("refresh") || content.includes("existing profile"),
      "onboard-agent should check for existing profiles"
    );
  });

  it("all key agents reference project-profile.md", () => {
    for (const name of ["spec-agent", "debug-agent", "architect-agent", "code-agent"]) {
      const content = readAgent(name);
      assert.ok(
        content.includes("project-profile.md"),
        `${name} should reference project-profile.md`
      );
    }
  });

  it("df-orchestrate checks for project profile in pre-flight", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("project-profile.md"),
      "df-orchestrate should check for project profile"
    );
  });

  it("CLAUDE.md documents /df-onboard", () => {
    const claudeMd = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
    assert.ok(
      claudeMd.includes("/df-onboard"),
      "CLAUDE.md should document /df-onboard"
    );
  });
});

// ===========================================================================
// 8. Bugfix red-green integrity
// ===========================================================================

describe("Bugfix red-green integrity", () => {
  it("code-agent defines strict red-green phases", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("Red Phase") || content.includes("PROVE THE BUG"),
      "code-agent should define Red Phase"
    );
    assert.ok(
      content.includes("Green Phase") || content.includes("FIX THE BUG"),
      "code-agent should define Green Phase"
    );
  });

  it("code-agent Step 1 prohibits source code changes", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("ONLY create/modify test files") ||
        content.includes("NO source code changes"),
      "Step 1 must prohibit source code changes"
    );
  });

  it("code-agent Step 2 prohibits test file changes", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("ONLY modify source code") ||
        content.includes("NO test file changes"),
      "Step 2 must prohibit test file changes"
    );
  });

  it("df-orchestrate verifies test FAILS in red phase", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("FAILS") || content.includes("fails"),
      "Orchestrator should verify test fails in red phase"
    );
  });

  it("df-orchestrate verifies test PASSES in green phase", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("PASSES") || content.includes("passes"),
      "Orchestrator should verify test passes in green phase"
    );
  });

  it("df-orchestrate checks for regression in green phase", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("regression") || content.includes("existing tests"),
      "Orchestrator should check for regression"
    );
  });
});

// ===========================================================================
// 8. Lifecycle — promote + archive flow
// ===========================================================================

describe("Promote and archive lifecycle", () => {
  it("df-orchestrate references promote-agent.md", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("promote-agent.md"),
      "Should reference promote-agent.md"
    );
  });

  it("df-orchestrate includes archive step", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.toLowerCase().includes("archive"),
      "Should include archive step"
    );
  });

  it("df-orchestrate updates manifest status transitions", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("manifest.json"),
      "Should reference manifest.json for status updates"
    );
  });

  it("df-cleanup skill exists and handles stuck states", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("passed") && content.includes("promoted"),
      "df-cleanup should handle passed and promoted stuck states"
    );
  });
});

// ===========================================================================
// 9. CLAUDE.md documents all commands
// ===========================================================================

describe("CLAUDE.md completeness", () => {
  const claudeMd = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");

  const requiredCommands = [
    "/df-onboard",
    "/df-intake",
    "/df-debug",
    "/df-orchestrate",
    "/df-cleanup",
    "/df-spec",
    "/df-scenario",
  ];

  for (const cmd of requiredCommands) {
    it(`documents ${cmd}`, () => {
      assert.ok(
        claudeMd.includes(cmd),
        `CLAUDE.md should document ${cmd}`
      );
    });
  }

  it("documents architect review in both pipelines", () => {
    assert.ok(
      claudeMd.includes("Architect review"),
      "CLAUDE.md should mention architect review"
    );
  });

  it("documents both feature and bugfix pipelines", () => {
    assert.ok(
      claudeMd.includes("Feature Pipeline"),
      "Should document feature pipeline"
    );
    assert.ok(
      claudeMd.includes("Bugfix Pipeline"),
      "Should document bugfix pipeline"
    );
  });
});

// ===========================================================================
// 10. Group orchestration flags documented
// ===========================================================================

describe("Group orchestration flags", () => {
  it("CLAUDE.md documents --group flag", () => {
    const claudeMd = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
    assert.ok(
      claudeMd.includes("--group"),
      "CLAUDE.md should document --group flag"
    );
  });

  it("CLAUDE.md documents --all flag", () => {
    const claudeMd = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
    assert.ok(
      claudeMd.includes("--all"),
      "CLAUDE.md should document --all flag"
    );
  });

  it("CLAUDE.md documents --force flag", () => {
    const claudeMd = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
    assert.ok(
      claudeMd.includes("--force"),
      "CLAUDE.md should document --force flag"
    );
  });

  it("dark-factory.md rules document --group flag", () => {
    const rules = fs.readFileSync(
      path.join(ROOT, ".claude", "rules", "dark-factory.md"),
      "utf8"
    );
    assert.ok(
      rules.includes("--group"),
      "dark-factory.md should document --group flag"
    );
  });

  it("dark-factory.md rules document --all flag", () => {
    const rules = fs.readFileSync(
      path.join(ROOT, ".claude", "rules", "dark-factory.md"),
      "utf8"
    );
    assert.ok(
      rules.includes("--all"),
      "dark-factory.md should document --all flag"
    );
  });

  it("dark-factory.md rules document --force flag", () => {
    const rules = fs.readFileSync(
      path.join(ROOT, ".claude", "rules", "dark-factory.md"),
      "utf8"
    );
    assert.ok(
      rules.includes("--force"),
      "dark-factory.md should document --force flag"
    );
  });

  it("df-orchestrate SKILL.md defines group mode section", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Group Mode"),
      "df-orchestrate should define Group Mode section"
    );
  });

  it("df-orchestrate SKILL.md defines all mode section", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("All Mode"),
      "df-orchestrate should define All Mode section"
    );
  });

  it("df-orchestrate SKILL.md defines cross-group guard", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Cross-Group Guard"),
      "df-orchestrate should define Cross-Group Guard section"
    );
  });

  it("df-orchestrate SKILL.md defines mutual exclusivity for --group and --all", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Cannot use --group and --all together"),
      "df-orchestrate should define mutual exclusivity error message"
    );
  });

  it("df-orchestrate SKILL.md defines mutual exclusivity for flags and explicit names", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Cannot combine --group/--all with explicit spec names"),
      "df-orchestrate should define flags + names exclusivity error message"
    );
  });

  it("df-orchestrate SKILL.md defines cycle detection in pre-flight", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Circular dependency detection") ||
        content.includes("circular dependency"),
      "df-orchestrate should include cycle detection"
    );
    assert.ok(
      content.includes("Circular dependency detected"),
      "df-orchestrate should include the cycle error message format"
    );
  });

  it("df-orchestrate SKILL.md defines cross-group dependency validation", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Cross-group dependency validation") ||
        content.includes("Dependencies must be within the same group"),
      "df-orchestrate should validate cross-group dependencies"
    );
  });

  it("df-orchestrate SKILL.md defines resume semantics", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Resume Semantics") || content.includes("resume"),
      "df-orchestrate should define resume semantics"
    );
    assert.ok(
      content.includes("already completed"),
      "df-orchestrate should show completed specs as skipped"
    );
  });

  it("df-orchestrate SKILL.md defines failure handling", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Failure Handling") ||
        content.includes("transitive dependents"),
      "df-orchestrate should define failure handling with dependent pausing"
    );
  });

  it("df-orchestrate SKILL.md handles backward compatibility for missing fields", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Missing `group`") || content.includes("missing `group`"),
      "df-orchestrate should handle missing group field"
    );
    assert.ok(
      content.includes("Missing `dependencies`") || content.includes("missing `dependencies`"),
      "df-orchestrate should handle missing dependencies field"
    );
  });

  it("df-orchestrate SKILL.md defines wave resolution algorithm", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Wave Resolution"),
      "df-orchestrate should define wave resolution algorithm"
    );
  });

  it("df-orchestrate SKILL.md --force warns when used with --group/--all", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("--force has no effect with --group/--all"),
      "df-orchestrate should warn about --force with --group/--all"
    );
  });
});

// ===========================================================================
// 11. Intake writes group and dependencies fields
// ===========================================================================

describe("Intake manifest field enforcement", () => {
  it("df-intake SKILL.md enforces mandatory group field", () => {
    const content = readSkill("df-intake");
    assert.ok(
      content.includes("MUST include") && content.includes("group"),
      "df-intake should enforce mandatory group field"
    );
  });

  it("df-intake SKILL.md enforces mandatory dependencies field", () => {
    const content = readSkill("df-intake");
    assert.ok(
      content.includes("MUST include") && content.includes("dependencies"),
      "df-intake should enforce mandatory dependencies field"
    );
  });

  it("df-intake SKILL.md sets group to null for standalone specs", () => {
    const content = readSkill("df-intake");
    assert.ok(
      content.includes("null") && content.includes("standalone"),
      "df-intake should set group to null for standalone specs"
    );
  });

  it("df-intake SKILL.md checks existing active specs for dependency overlap", () => {
    const content = readSkill("df-intake");
    assert.ok(
      content.includes("existing active specs") && content.includes("overlap"),
      "df-intake should check existing active specs for file overlap"
    );
  });
});

// ===========================================================================
// 12. Plugin mirrors match source files for group-orchestrate
// ===========================================================================

describe("Plugin mirrors for group-orchestrate", () => {
  it("plugins df-orchestrate SKILL.md matches source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "skills", "df-orchestrate", "SKILL.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "skills", "df-orchestrate", "SKILL.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin df-orchestrate SKILL.md should match source");
  });

  it("plugins df-intake SKILL.md matches source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "skills", "df-intake", "SKILL.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "skills", "df-intake", "SKILL.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin df-intake SKILL.md should match source");
  });

  it("plugins dark-factory.md rules match source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "rules", "dark-factory.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", ".claude", "rules", "dark-factory.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin dark-factory.md should match source");
  });
});

// ===========================================================================
// 13. Init script produces correct scaffold
// ===========================================================================

describe("init-dark-factory.js scaffold", () => {
  const tmpDir = path.join(
    require("os").tmpdir(),
    `df-test-${Date.now()}`
  );

  before(() => {
    execSync(
      `node ${path.join(ROOT, "scripts", "init-dark-factory.js")} --dir ${tmpDir}`,
      { stdio: "pipe" }
    );
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const expectedAgentFiles = [
    "spec-agent.md",
    "debug-agent.md",
    "onboard-agent.md",
    "architect-agent.md",
    "code-agent.md",
    "test-agent.md",
    "promote-agent.md",
  ];

  for (const file of expectedAgentFiles) {
    it(`creates .claude/agents/${file}`, () => {
      assert.ok(
        fs.existsSync(path.join(tmpDir, ".claude", "agents", file)),
        `Scaffold should create ${file}`
      );
    });
  }

  const expectedSkillDirs = [
    "df-onboard",
    "df-intake",
    "df-debug",
    "df-orchestrate",
    "df-spec",
    "df-scenario",
    "df-cleanup",
  ];

  for (const skill of expectedSkillDirs) {
    it(`creates .claude/skills/${skill}/SKILL.md`, () => {
      assert.ok(
        fs.existsSync(
          path.join(tmpDir, ".claude", "skills", skill, "SKILL.md")
        ),
        `Scaffold should create ${skill}/SKILL.md`
      );
    });
  }

  const expectedDirs = [
    "dark-factory/specs/features",
    "dark-factory/specs/bugfixes",
    "dark-factory/scenarios/public",
    "dark-factory/scenarios/holdout",
    "dark-factory/results",
    "dark-factory/archive",
  ];

  for (const dir of expectedDirs) {
    it(`creates ${dir}/`, () => {
      assert.ok(
        fs.existsSync(path.join(tmpDir, dir)),
        `Scaffold should create ${dir}/`
      );
    });
  }

  it("creates valid manifest.json", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "dark-factory", "manifest.json"), "utf8")
    );
    assert.equal(manifest.version, 1);
    assert.deepEqual(manifest.features, {});
  });

  it("creates CLAUDE.md with Dark Factory section", () => {
    const content = fs.readFileSync(
      path.join(tmpDir, "CLAUDE.md"),
      "utf8"
    );
    assert.ok(content.includes("Dark Factory"));
    assert.ok(content.includes("/df-intake"));
    assert.ok(content.includes("/df-debug"));
    assert.ok(content.includes("/df-orchestrate"));
    assert.ok(content.includes("Architect review"));
  });

  it("creates .gitignore with results excluded", () => {
    const content = fs.readFileSync(
      path.join(tmpDir, ".gitignore"),
      "utf8"
    );
    assert.ok(content.includes("dark-factory/results/"));
  });

  it("scaffold agents have matching frontmatter names", () => {
    for (const file of expectedAgentFiles) {
      const name = file.replace(".md", "");
      const content = fs.readFileSync(
        path.join(tmpDir, ".claude", "agents", file),
        "utf8"
      );
      const fm = parseFrontmatter(content);
      assert.ok(fm, `${file} should have frontmatter`);
      assert.equal(fm.name, name, `${file} frontmatter name should be "${name}"`);
    }
  });

  it("scaffold skills have matching frontmatter names", () => {
    for (const skill of expectedSkillDirs) {
      const content = fs.readFileSync(
        path.join(tmpDir, ".claude", "skills", skill, "SKILL.md"),
        "utf8"
      );
      const fm = parseFrontmatter(content);
      assert.ok(fm, `${skill}/SKILL.md should have frontmatter`);
      assert.equal(fm.name, skill, `${skill}/SKILL.md frontmatter name should be "${skill}"`);
    }
  });

  it("scaffold is idempotent (running twice doesn't error)", () => {
    assert.doesNotThrow(() => {
      execSync(
        `node ${path.join(ROOT, "scripts", "init-dark-factory.js")} --dir ${tmpDir}`,
        { stdio: "pipe" }
      );
    });
  });
});
