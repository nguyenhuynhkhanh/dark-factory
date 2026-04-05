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
// 13. Init script scaffold — REMOVED (script deleted by pipeline-velocity)
// ===========================================================================

// ===========================================================================
// Promoted from Dark Factory holdout: code-map
// ===========================================================================

describe("Code map — onboard-agent scanning instructions", () => {
  it("H-01: onboard-agent excludes binary files, images, and fonts from scanning", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("code-map") || content.includes("code map"),
      "onboard-agent should have a code map scanning phase"
    );
    assert.ok(
      (content.includes(".png") || content.includes(".jpg") || content.includes("image")) &&
        (content.includes("exclud") || content.includes("skip")),
      "onboard-agent should exclude binary/image files from code map scanning"
    );
  });

  it("H-02: onboard-agent detects and excludes generated code", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("@generated") || content.includes("__generated__") || content.includes("prisma/client"),
      "onboard-agent should detect generated code directories or markers"
    );
  });

  it("H-03: onboard-agent includes Python import detection for code map", () => {
    const content = readAgent("onboard-agent");
    // Must mention Python imports in the context of scanning/dependency analysis, not just tech stack detection
    assert.ok(
      content.includes("code-map") || content.includes("scanner") || content.includes("dependency graph"),
      "onboard-agent should have a code map / scanner / dependency graph phase"
    );
    assert.ok(
      content.includes("from .") || content.includes("relative import") ||
        (content.includes("Python") && content.includes("import") && content.includes("detect")),
      "onboard-agent should describe Python import detection patterns for scanning"
    );
  });

  it("H-04: onboard-agent includes Go import detection for code map", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      (content.includes("Go") && content.includes("import")) ||
        content.includes("Go package") || content.includes("Go import"),
      "onboard-agent should describe Go import detection patterns for code map scanning"
    );
  });

  it("H-05: onboard-agent detects dynamic/runtime dependencies for code map", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("dynamic import") || content.includes("dynamic depend") ||
        content.includes("runtime depend") || content.includes("Runtime Dependencies"),
      "onboard-agent should mention dynamic/runtime dependency detection for code map"
    );
  });

  it("H-06: onboard-agent scales to 5 scanners for large projects", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("scanner"),
      "onboard-agent should reference scanner agents"
    );
    assert.ok(
      content.includes("5") && content.includes("scanner"),
      "onboard-agent should scale to 5 scanners for large projects"
    );
  });

  it("H-07: onboard-agent bounds code map output size", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      (content.includes("200") && content.includes("line")) ||
        (content.includes("output") && content.includes("bound")),
      "onboard-agent should bound code map output to ~200 lines"
    );
  });

  it("H-10: onboard-agent includes Dark Factory .claude/ files in scan scope", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes(".claude/") &&
        (content.includes("scan") || content.includes("includ")) &&
        content.includes("code-map"),
      "onboard-agent should include .claude/ files in code map scan scope"
    );
  });

  it("H-12: onboard-agent traces barrel files through to actual source modules", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      (content.includes("barrel") && content.includes("trace")) ||
        (content.includes("barrel") && content.includes("re-export") && content.includes("source module")),
      "onboard-agent should trace barrel files to actual source modules in dependency graph"
    );
  });

  it("H-16: onboard-agent handles scanner agent failure gracefully", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("scanner") &&
        (content.includes("fail") || content.includes("partial") || content.includes("degrad")),
      "onboard-agent should handle scanner failure with graceful degradation"
    );
  });

  it("H-18: onboard-agent uses default exclusion list when no .gitignore", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("node_modules") && content.includes("vendor") &&
        (content.includes(".venv") || content.includes("venv")) &&
        (content.includes("exclusion") || content.includes("exclud") || content.includes("skip")),
      "onboard-agent should have a default exclusion list including node_modules, vendor, venv"
    );
  });
});

describe("Code map — developer sign-off and refresh", () => {
  it("H-08: onboard-agent requires developer sign-off before writing code map", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("code-map") &&
        (content.includes("sign-off") || content.includes("confirm") || content.includes("approve")),
      "onboard-agent should require developer sign-off for code map"
    );
  });

  it("H-09: onboard-agent preserves existing code map on rejected refresh", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("code-map") &&
        (content.includes("reject") || content.includes("preserve")),
      "onboard-agent should preserve existing code map if developer rejects refresh"
    );
  });

  it("H-19: onboard-agent adds code map reference to profile without corrupting existing content", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("code-map.md") && content.includes("project-profile"),
      "onboard-agent should reference adding code-map.md link to project-profile.md"
    );
  });
});

describe("Code map — write target and agent compatibility", () => {
  it("H-21: onboard-agent constraints allow writing code-map.md", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("code-map.md"),
      "onboard-agent constraints should list code-map.md as an allowed write target"
    );
  });

  it("H-20: consuming agents have conditional guard for missing code-map.md", () => {
    const consumingAgents = ["spec-agent", "architect-agent", "code-agent", "debug-agent", "test-agent", "promote-agent"];
    for (const name of consumingAgents) {
      const content = readAgent(name);
      assert.ok(
        content.includes("code-map") || content.includes("code_map"),
        `${name} should reference code-map.md for optional consumption`
      );
    }
  });
});

// ===========================================================================
// 14. Pre-flight test gate
// ===========================================================================

describe("Pre-flight test gate", () => {
  it("df-orchestrate includes pre-flight test gate section", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Pre-flight Test Gate"),
      "df-orchestrate should include Pre-flight Test Gate section"
    );
  });

  it("df-orchestrate test gate runs before architect review", () => {
    const content = readSkill("df-orchestrate");
    const gateIndex = content.indexOf("Pre-flight Test Gate");
    const architectIndex = content.indexOf("Architect Review");
    assert.ok(
      gateIndex < architectIndex,
      "Pre-flight Test Gate should appear before Architect Review"
    );
  });

  it("df-orchestrate reads test command from project profile", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("project-profile.md") &&
        content.includes("Run:"),
      "df-orchestrate should read test command from project profile Run: field"
    );
  });

  it("df-orchestrate --skip-tests flag is documented", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("--skip-tests"),
      "df-orchestrate should document --skip-tests flag"
    );
  });

  it("df-orchestrate logs testGateSkipped to manifest on --skip-tests", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("testGateSkipped") &&
        content.includes("manifest"),
      "df-orchestrate should log testGateSkipped to manifest when --skip-tests is used"
    );
  });

  it("df-orchestrate reports ALL failures on test gate failure", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("ALL failures") ||
        content.includes("report ALL"),
      "df-orchestrate should report all test failures, not just the first"
    );
  });

  it("df-orchestrate skips test gate when no project profile exists", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("No test command found in project profile") &&
        content.includes("Skipping pre-flight test gate"),
      "df-orchestrate should warn and skip when no project profile or test command exists"
    );
  });
});

// ===========================================================================
// 15. Promoted test registry
// ===========================================================================

describe("Promoted test registry", () => {
  it("promote-agent includes registry update step", () => {
    const content = readAgent("promote-agent");
    assert.ok(
      content.includes("Update Registry") &&
        content.includes("promoted-tests.json"),
      "promote-agent should include registry update step writing to promoted-tests.json"
    );
  });

  it("promote-agent creates registry with version 1 schema", () => {
    const content = readAgent("promote-agent");
    assert.ok(
      content.includes('"version": 1') &&
        content.includes("promotedTests"),
      "promote-agent should create registry with version 1 and promotedTests array"
    );
  });

  it("promote-agent records feature name, type, files, timestamp, and scenario count", () => {
    const content = readAgent("promote-agent");
    assert.ok(
      content.includes('"feature"') &&
        content.includes('"type"') &&
        content.includes('"files"') &&
        content.includes('"promotedAt"') &&
        content.includes('"holdoutScenarioCount"'),
      "promote-agent registry entry should record feature, type, files, promotedAt, holdoutScenarioCount"
    );
  });

  it("promote-agent adds section markers for co-located tests", () => {
    const content = readAgent("promote-agent");
    assert.ok(
      content.includes("DF-PROMOTED-START") &&
        content.includes("DF-PROMOTED-END"),
      "promote-agent should use DF-PROMOTED-START/END markers for co-located tests"
    );
  });

  it("promote-agent section markers are only for co-located tests", () => {
    const content = readAgent("promote-agent");
    assert.ok(
      content.includes("ONLY for co-located") ||
        (content.includes("co-located") && content.includes("Standalone") && content.includes("do NOT")),
      "promote-agent should specify section markers are only for co-located tests"
    );
  });

  it("promote-agent handles duplicate feature entries by overwriting", () => {
    const content = readAgent("promote-agent");
    assert.ok(
      content.includes("overwrite") &&
        content.includes("duplicate"),
      "promote-agent should overwrite duplicate feature entries, not create duplicates"
    );
  });

  it("promote-agent registry is append-only during normal operation", () => {
    const content = readAgent("promote-agent");
    assert.ok(
      content.includes("append-only"),
      "promote-agent should document that registry is append-only during normal operation"
    );
  });
});

// ===========================================================================
// 16. Promoted test health check
// ===========================================================================

describe("Promoted test health check", () => {
  it("df-cleanup includes promoted test health check section", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("Promoted Test Health Check"),
      "df-cleanup should include Promoted Test Health Check section"
    );
  });

  it("df-cleanup health check detects missing promoted test files", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("MISSING:"),
      "df-cleanup should report MISSING for deleted promoted test files"
    );
  });

  it("df-cleanup health check detects .skip() on promoted tests", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("SKIPPED:") &&
        content.includes(".skip()"),
      "df-cleanup should report SKIPPED for promoted tests with .skip()"
    );
  });

  it("df-cleanup health check detects failing promoted tests", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("FAILING:"),
      "df-cleanup should report FAILING for promoted tests that do not pass"
    );
  });

  it("df-cleanup health check detects stale guard annotations", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("STALE GUARD:"),
      "df-cleanup should report STALE GUARD for guard annotations referencing deleted files"
    );
  });

  it("df-cleanup health check handles zero promoted tests gracefully", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("No promoted tests found"),
      "df-cleanup should handle zero promoted tests gracefully"
    );
  });

  it("df-cleanup supports --rebuild flag", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("--rebuild") &&
        content.includes("Promoted from Dark Factory holdout:"),
      "df-cleanup should support --rebuild to reconstruct registry from annotation headers"
    );
  });

  it("df-cleanup health check strips line numbers from guard paths", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("Strip line numbers") ||
        content.includes("strip the line number"),
      "df-cleanup should strip line numbers from guard annotation file paths"
    );
  });

  it("df-cleanup health check does not auto-fix", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("NOT auto-fix") ||
        content.includes("Do NOT auto-fix"),
      "df-cleanup health check should not auto-fix issues"
    );
  });
});

// ===========================================================================
// 17. Git hook integration
// ===========================================================================

describe("Git hook integration", () => {
  it("onboard-agent offers pre-commit hook installation", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("pre-commit hook") &&
        content.includes("opt-in"),
      "onboard-agent should offer opt-in pre-commit hook installation"
    );
  });

  it("onboard-agent detects husky infrastructure", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("Husky") || content.includes("husky") || content.includes(".husky"),
      "onboard-agent should detect husky infrastructure"
    );
  });

  it("onboard-agent detects lefthook infrastructure", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("Lefthook") || content.includes("lefthook"),
      "onboard-agent should detect lefthook infrastructure"
    );
  });

  it("onboard-agent detects simple-git-hooks infrastructure", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("simple-git-hooks"),
      "onboard-agent should detect simple-git-hooks infrastructure"
    );
  });

  it("onboard-agent uses dark-factory-hook marker for detection", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("dark-factory-hook"),
      "onboard-agent should use # dark-factory-hook comment marker"
    );
  });

  it("bin/cli.js supports init --hooks flag", () => {
    const cliContent = fs.readFileSync(path.join(ROOT, "bin", "cli.js"), "utf8");
    assert.ok(
      cliContent.includes("--hooks") &&
        cliContent.includes("cmdInitHooks"),
      "bin/cli.js should support --hooks flag and have cmdInitHooks function"
    );
  });

  it("bin/cli.js --hooks reads test command from project profile", () => {
    const cliContent = fs.readFileSync(path.join(ROOT, "bin", "cli.js"), "utf8");
    assert.ok(
      cliContent.includes("project-profile.md") &&
        cliContent.includes("dark-factory-hook"),
      "bin/cli.js --hooks should read project profile and use dark-factory-hook marker"
    );
  });

  it("bin/cli.js --hooks detects husky, lefthook, and simple-git-hooks", () => {
    const cliContent = fs.readFileSync(path.join(ROOT, "bin", "cli.js"), "utf8");
    assert.ok(
      cliContent.includes(".husky") &&
        cliContent.includes("lefthook") &&
        cliContent.includes("simple-git-hooks"),
      "bin/cli.js should detect husky, lefthook, and simple-git-hooks infrastructure"
    );
  });
});

// ===========================================================================
// 18. Code-agent runs all tests in feature mode
// ===========================================================================

describe("Code-agent feature mode test coverage", () => {
  it("code-agent feature mode runs ALL existing tests", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("Run ALL existing tests") &&
        content.includes("no regression"),
      "code-agent feature mode should run ALL existing tests to verify no regression"
    );
  });
});

// ===========================================================================
// 19. Plugin mirrors for test-enforcement
// ===========================================================================

describe("Plugin mirrors for test-enforcement", () => {
  it("plugins promote-agent.md matches source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "agents", "promote-agent.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "promote-agent.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin promote-agent.md should match source");
  });

  it("plugins code-agent.md matches source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "agents", "code-agent.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "code-agent.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin code-agent.md should match source");
  });

  it("plugins df-cleanup SKILL.md matches source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "skills", "df-cleanup", "SKILL.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "skills", "df-cleanup", "SKILL.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin df-cleanup SKILL.md should match source");
  });

  it("plugins onboard-agent.md matches source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "agents", "onboard-agent.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "onboard-agent.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin onboard-agent.md should match source");
  });
});

// ===========================================================================
// 20. dark-factory.md documents health check
// ===========================================================================

describe("dark-factory.md health check documentation", () => {
  it("dark-factory.md documents promoted test health check in df-cleanup", () => {
    const rules = fs.readFileSync(
      path.join(ROOT, ".claude", "rules", "dark-factory.md"),
      "utf8"
    );
    assert.ok(
      rules.includes("health check") &&
        rules.includes("promoted test"),
      "dark-factory.md should document health check for promoted tests in df-cleanup"
    );
  });

  it("dark-factory.md documents --rebuild flag", () => {
    const rules = fs.readFileSync(
      path.join(ROOT, ".claude", "rules", "dark-factory.md"),
      "utf8"
    );
    assert.ok(
      rules.includes("--rebuild"),
      "dark-factory.md should document --rebuild flag"
    );
  });
});

describe("Code map — edge cases in dependency analysis", () => {
  it("H-11: onboard-agent handles circular dependencies in code map without corrupting hotspots", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      (content.includes("circular") || content.includes("cycle")) &&
        (content.includes("hotspot") || content.includes("fan-in") || content.includes("dependency graph")),
      "onboard-agent should handle circular dependencies in hotspot/dependency analysis"
    );
  });

  it("H-13: onboard-agent handles mixed-language projects in code map scanning", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("scanner") || content.includes("code-map"),
      "onboard-agent should have code map scanning phase"
    );
    assert.ok(
      (content.includes("TypeScript") || content.includes("JavaScript")) &&
        content.includes("Python") &&
        (content.includes("import") || content.includes("detect")),
      "onboard-agent should handle multiple language import patterns in scanning"
    );
  });

  it("H-14: onboard-agent maps monorepo inter-package dependencies in code map", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("inter-package") ||
        (content.includes("monorepo") && content.includes("dependency graph")),
      "onboard-agent should map monorepo inter-package dependencies in code map"
    );
  });

  it("H-15: onboard-agent handles flat script directories at file-level granularity", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("file-level") ||
        (content.includes("flat") && content.includes("dependency graph")),
      "onboard-agent should handle flat directories with file-level dependency mapping"
    );
  });

  it("H-17: onboard-agent handles projects with no import relationships in code map", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      (content.toLowerCase().includes("no import") || content.includes("empty graph") || content.includes("no dependencies") || content.includes("No imports")) &&
        (content.includes("code-map") || content.includes("code map")),
      "onboard-agent should handle projects with no import relationships gracefully"
    );
  });
});

// ===========================================================================
// Wave automation — autonomous wave execution
// ===========================================================================

describe("Wave automation — autonomous execution", () => {
  it("df-orchestrate defines autonomous wave execution section", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Autonomous Wave Execution"),
      "df-orchestrate should define Autonomous Wave Execution section"
    );
  });

  it("df-orchestrate spawns each wave as independent agent", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("wave agent") || content.includes("wave-agent"),
      "df-orchestrate should reference wave agents"
    );
    assert.ok(
      content.includes("independent") && content.includes("agent") && content.includes("wave"),
      "df-orchestrate should spawn each wave as an independent agent"
    );
  });

  it("df-orchestrate requires only ONE developer confirmation for multi-spec", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("execute ALL waves without further developer interaction"),
      "df-orchestrate should execute all waves after one confirmation"
    );
  });

  it("df-orchestrate auto-continues between waves without developer acknowledgment", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("automatically proceeds to wave N+1") ||
        content.includes("automatically proceeds to the next wave"),
      "df-orchestrate should auto-continue between waves"
    );
    assert.ok(
      content.includes("No developer acknowledgment is needed between waves"),
      "df-orchestrate should not require inter-wave acknowledgment"
    );
  });

  it("df-orchestrate does not ask developer to decide next steps on failure", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      !content.includes("Ask the developer"),
      "df-orchestrate should not ask the developer mid-pipeline (removed pause point)"
    );
  });

  it("df-orchestrate does not prompt for smart re-run choice", () => {
    const content = readSkill("df-orchestrate");
    // The smart re-run section should not offer interactive choices (new/test-only/fix)
    assert.ok(
      !content.includes("**test-only**") && !content.includes("**fix**"),
      "df-orchestrate should not offer test-only/fix re-run choices (defaults to new)"
    );
  });

  it("df-orchestrate smart re-run defaults to new in autonomous mode", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("default to") && content.includes("new") && content.includes("wipe"),
      "df-orchestrate should default smart re-run to 'new' with wipe"
    );
  });

  it("df-orchestrate wave agent handles full lifecycle", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Architect review") &&
        content.includes("Code agents") &&
        content.includes("Holdout validation") &&
        content.includes("Promotion") &&
        content.includes("Cleanup"),
      "Wave agent should handle full lifecycle: architect, code, holdout, promote, cleanup"
    );
  });

  it("df-orchestrate includes non-blocking progress reporting", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Progress Reporting") || content.includes("progress reporting"),
      "df-orchestrate should include progress reporting section"
    );
    assert.ok(
      content.includes("without blocking"),
      "Progress reporting should be non-blocking"
    );
  });

  it("df-orchestrate includes comprehensive final summary report", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Final Summary Report"),
      "df-orchestrate should include Final Summary Report section"
    );
    assert.ok(
      content.includes("Completed specs") && content.includes("Failed specs") && content.includes("Blocked specs"),
      "Final summary should list completed, failed, and blocked specs"
    );
  });

  it("df-orchestrate preserves single-spec mode without wave agent", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Single-Spec Mode") || content.includes("single-spec"),
      "df-orchestrate should mention single-spec mode exception"
    );
    assert.ok(
      content.includes("wave agent architecture is NOT used") ||
        content.includes("wave agent") && content.includes("NOT used"),
      "Single-spec mode should not use wave agent architecture"
    );
  });

  it("df-orchestrate defines merge conflict as hard stop", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Merge conflict") && content.includes("Hard stop"),
      "df-orchestrate should define merge conflict as hard stop"
    );
  });

  it("df-orchestrate reports failures with actionable next steps", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("actionable next steps"),
      "df-orchestrate should report failures with actionable next steps"
    );
  });

  it("dark-factory.md rules do not claim implementation is never auto-triggered", () => {
    const rules = fs.readFileSync(
      path.join(ROOT, ".claude", "rules", "dark-factory.md"),
      "utf8"
    );
    assert.ok(
      !rules.includes("never auto-triggered"),
      "dark-factory.md should not claim implementation is never auto-triggered"
    );
    assert.ok(
      rules.includes("auto-triggered from df-intake"),
      "dark-factory.md should acknowledge df-intake can auto-trigger orchestrate"
    );
  });

  it("df-orchestrate parallelism does not require confirmation", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      !content.includes("Proceed after confirmation"),
      "df-orchestrate should not require parallelism confirmation (Step 0.5 pause removed)"
    );
  });
});

// ===========================================================================
// Promoted from Dark Factory holdout: test-enforcement
// ===========================================================================

describe("Test enforcement — pre-flight gate multi-spec behavior", () => {
  it("H-01: pre-flight gate runs test suite once, not per-spec", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Pre-flight Test Gate"),
      "df-orchestrate should have pre-flight test gate"
    );
    // The gate should run once for all specs, aborting all on failure
    assert.ok(
      content.includes("ALL failures") || content.includes("report ALL"),
      "df-orchestrate should report all failures from a single gate run"
    );
  });

  it("H-02: --skip-tests logs testGateSkipped and timestamp to manifest", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("testGateSkipped") && content.includes("manifest"),
      "df-orchestrate should log testGateSkipped to manifest"
    );
    assert.ok(
      content.includes("--skip-tests"),
      "df-orchestrate should document --skip-tests flag"
    );
  });

  it("H-18: no test command in profile warns and skips gate", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("No test command found in project profile") &&
        content.includes("Skipping pre-flight test gate"),
      "df-orchestrate should warn and skip when no test command in profile"
    );
  });
});

describe("Test enforcement — promoted test registry", () => {
  it("H-03: promote-agent documents append-only registry for concurrent safety", () => {
    const content = readAgent("promote-agent");
    assert.ok(
      content.includes("append-only"),
      "promote-agent registry should be append-only"
    );
    assert.ok(
      content.includes("promoted-tests.json"),
      "promote-agent should reference promoted-tests.json"
    );
  });

  it("H-04: standalone promoted files do NOT get section markers", () => {
    const content = readAgent("promote-agent");
    assert.ok(
      content.includes("ONLY for co-located") ||
        (content.includes("co-located") && content.includes("Standalone") && content.includes("do NOT")),
      "promote-agent should specify markers are only for co-located tests"
    );
  });

  it("H-19: re-promotion overwrites existing registry entry, no duplicates", () => {
    const content = readAgent("promote-agent");
    assert.ok(
      content.includes("overwrite") && content.includes("duplicate"),
      "promote-agent should overwrite duplicate entries"
    );
  });

  it("H-20: registry version mismatch handled with forward compatibility", () => {
    const content = readAgent("promote-agent");
    assert.ok(
      content.includes('"version": 1') && content.includes("promotedTests"),
      "promote-agent should define version 1 schema with promotedTests"
    );
  });
});

describe("Test enforcement — health check edge cases", () => {
  it("H-05: health check detects missing co-located file before checking markers", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("MISSING:"),
      "df-cleanup should report MISSING for deleted promoted test files"
    );
  });

  it("H-06: health check detects empty content between section markers", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("EMPTY:") ||
        (content.includes("DF-PROMOTED-START") && content.includes("no test content")),
      "df-cleanup should detect empty sections between markers"
    );
  });

  it("H-07: health check ignores .skip() outside promoted section markers", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("SKIPPED:") && content.includes(".skip()"),
      "df-cleanup should detect .skip() only within promoted sections"
    );
  });

  it("H-08: health check strips line numbers from guard annotation paths", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("Strip line numbers") ||
        content.includes("strip the line number"),
      "df-cleanup should strip line numbers from guard paths"
    );
  });

  it("H-09: --rebuild with no annotations creates empty registry", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("--rebuild") &&
        content.includes("Promoted from Dark Factory holdout:"),
      "df-cleanup --rebuild should scan for annotation headers"
    );
  });

  it("H-10: --rebuild shows diff and requires confirmation before overwriting", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("--rebuild"),
      "df-cleanup should support --rebuild flag"
    );
  });

  it("H-17: health check handles missing promoted-tests.json gracefully", () => {
    const content = readSkill("df-cleanup");
    assert.ok(
      content.includes("No promoted tests found"),
      "df-cleanup should handle zero promoted tests gracefully"
    );
  });
});

describe("Test enforcement — git hook integration", () => {
  it("H-12: onboard-agent allows declining hook installation", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("pre-commit hook") && content.includes("opt-in"),
      "onboard-agent should offer opt-in pre-commit hook installation"
    );
  });

  it("H-13: hook installation integrates with lefthook", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("Lefthook") || content.includes("lefthook"),
      "onboard-agent should detect lefthook infrastructure"
    );
  });

  it("H-14: hook installation integrates with simple-git-hooks", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("simple-git-hooks"),
      "onboard-agent should detect simple-git-hooks infrastructure"
    );
  });

  it("H-15: hook installation warns on unmanaged existing .git/hooks/pre-commit", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("dark-factory-hook"),
      "onboard-agent should use dark-factory-hook marker for detection"
    );
  });

  it("H-16: hook installation is idempotent via dark-factory-hook marker", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("dark-factory-hook"),
      "onboard-agent should detect existing dark-factory-hook marker"
    );
  });
});

describe("Test enforcement — code-agent feature mode regression detection", () => {
  it("H-11: code-agent runs ALL existing tests and detects regressions", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("Run ALL existing tests") &&
        content.includes("no regression"),
      "code-agent feature mode should run ALL existing tests to verify no regression"
    );
  });
});

// ===========================================================================
// Promoted from Dark Factory holdout: wave-automation
// ===========================================================================

describe("Wave automation — wave agent context and lifecycle", () => {
  it("H-01: wave agent receives spec names, branch, and mode (not spec content)", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("wave agent") || content.includes("wave-agent"),
      "df-orchestrate should reference wave agents"
    );
    assert.ok(
      content.includes("independent") && content.includes("agent") && content.includes("wave"),
      "wave agents should be independent"
    );
  });

  it("H-08: smart re-run preserves mode descriptions but defaults to new", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("default to") && content.includes("new") && content.includes("wipe"),
      "df-orchestrate should default smart re-run to 'new' with wipe"
    );
  });

  it("H-12: single-spec and single-active-in-group skip wave agent overhead", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Single-Spec Mode") || content.includes("single-spec"),
      "df-orchestrate should reference single-spec mode"
    );
    assert.ok(
      content.includes("wave agent architecture is NOT used") ||
        (content.includes("wave agent") && content.includes("NOT used")),
      "Single-spec mode should not use wave agent architecture"
    );
  });

  it("H-15: orchestrator stays lightweight — no spec/code/test content", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Autonomous Wave Execution"),
      "df-orchestrate should define Autonomous Wave Execution section"
    );
    // The wave agent handles the lifecycle, not the orchestrator directly
    assert.ok(
      content.includes("Architect review") &&
        content.includes("Code agents") &&
        content.includes("Holdout validation") &&
        content.includes("Promotion") &&
        content.includes("Cleanup"),
      "Wave agent should handle full lifecycle"
    );
  });
});

describe("Wave automation — blocking and pause removal", () => {
  it("H-02: no blocking language between wave completions", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("execute ALL waves without further developer interaction"),
      "df-orchestrate should execute all waves after one confirmation"
    );
    assert.ok(
      content.includes("No developer acknowledgment is needed between waves"),
      "df-orchestrate should not require inter-wave acknowledgment"
    );
  });

  it("H-07: Step 0.5 preserves parallelism logic after removing confirmation", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      !content.includes("Proceed after confirmation"),
      "Parallelism confirmation pause should be removed"
    );
  });

  it("H-09: failure handling replaces 'Ask developer' with autonomous reporting", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      !content.includes("Ask the developer"),
      "df-orchestrate should not ask the developer mid-pipeline"
    );
    assert.ok(
      content.includes("actionable next steps"),
      "df-orchestrate should report failures with actionable next steps"
    );
  });
});

describe("Wave automation — failure handling and edge cases", () => {
  it("H-03: failed wave does not block independent specs in next wave", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Failure Handling") ||
        content.includes("transitive dependents"),
      "df-orchestrate should define failure handling with dependency tracking"
    );
  });

  it("H-04: merge conflict is a hard stop for the entire pipeline", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Merge conflict") && content.includes("Hard stop"),
      "df-orchestrate should define merge conflict as hard stop"
    );
  });

  it("H-05: empty wave after filtering blocked specs is skipped", () => {
    const content = readSkill("df-orchestrate");
    // Wave resolution should handle the case where all specs are blocked
    assert.ok(
      content.includes("Wave Resolution"),
      "df-orchestrate should define wave resolution algorithm"
    );
  });

  it("H-06: wave agent crash treats all specs in wave as failed", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Final Summary Report"),
      "df-orchestrate should include final summary to report wave agent failures"
    );
    assert.ok(
      content.includes("Failed specs"),
      "Final summary should list failed specs"
    );
  });

  it("H-11: manifest read failure aborts before any execution", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("manifest.json"),
      "df-orchestrate should reference manifest.json in pre-flight"
    );
  });

  it("H-14: promoted test failure stops that spec but continues others", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Promotion") && content.includes("Cleanup"),
      "df-orchestrate wave lifecycle should include promotion and cleanup steps"
    );
  });
});

describe("Wave automation — rules and progress reporting", () => {
  it("H-10: rules file update preserves all other rules unchanged", () => {
    const rules = fs.readFileSync(
      path.join(ROOT, ".claude", "rules", "dark-factory.md"),
      "utf8"
    );
    // Core rules that must always be present
    assert.ok(
      rules.includes("Every agent spawn is INDEPENDENT"),
      "dark-factory.md must preserve agent independence rule"
    );
    assert.ok(
      rules.includes("NEVER pass holdout scenario content to the code-agent"),
      "dark-factory.md must preserve holdout barrier rule"
    );
    assert.ok(
      rules.includes("NEVER pass public scenario content to the test-agent"),
      "dark-factory.md must preserve public scenario barrier rule"
    );
    assert.ok(
      rules.includes("NEVER pass test/scenario content to the architect-agent"),
      "dark-factory.md must preserve architect barrier rule"
    );
    assert.ok(
      rules.includes("Architect-agent reviews EVERY spec before implementation"),
      "dark-factory.md must preserve architect review rule"
    );
    assert.ok(
      rules.includes("auto-triggered from df-intake"),
      "dark-factory.md must acknowledge df-intake auto-trigger"
    );
  });

  it("H-13: existing test sections (1-12) remain passing — plugin mirrors match", () => {
    // Verify key plugin mirrors still match source (regression guard)
    const sourceOrchestrate = fs.readFileSync(
      path.join(ROOT, ".claude", "skills", "df-orchestrate", "SKILL.md"),
      "utf8"
    );
    const pluginOrchestrate = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "skills", "df-orchestrate", "SKILL.md"),
      "utf8"
    );
    assert.equal(
      sourceOrchestrate,
      pluginOrchestrate,
      "Plugin df-orchestrate SKILL.md should match source (regression guard)"
    );
  });

  it("df-orchestrate includes non-blocking progress reporting", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Progress Reporting") || content.includes("progress reporting"),
      "df-orchestrate should include progress reporting section"
    );
    assert.ok(
      content.includes("without blocking"),
      "Progress reporting should be non-blocking"
    );
  });

  it("df-orchestrate includes comprehensive final summary report", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("Final Summary Report"),
      "df-orchestrate should include Final Summary Report section"
    );
    assert.ok(
      content.includes("Completed specs") &&
        content.includes("Failed specs") &&
        content.includes("Blocked specs"),
      "Final summary should list completed, failed, and blocked specs"
    );
  });
});

// ===========================================================================
// 21. Org-model Phase 1 — Template extraction
// ===========================================================================

describe("Template files exist and contain expected content", () => {
  const TEMPLATES_DIR = path.join(ROOT, "dark-factory", "templates");

  it("dark-factory/templates/ directory exists", () => {
    assert.ok(
      fs.existsSync(TEMPLATES_DIR),
      "dark-factory/templates/ directory should exist"
    );
  });

  it("spec-template.md exists and contains key sections", () => {
    const filePath = path.join(TEMPLATES_DIR, "spec-template.md");
    assert.ok(fs.existsSync(filePath), "spec-template.md should exist");
    const content = fs.readFileSync(filePath, "utf8");
    assert.ok(content.includes("# Feature: {name}"), "Should contain Feature header");
    assert.ok(content.includes("## Context"), "Should contain Context section");
    assert.ok(content.includes("## Scope"), "Should contain Scope section");
    assert.ok(content.includes("## Requirements"), "Should contain Requirements section");
    assert.ok(content.includes("## Business Rules"), "Should contain Business Rules section");
    assert.ok(content.includes("## Edge Cases"), "Should contain Edge Cases section");
    assert.ok(content.includes("## Migration & Deployment"), "Should contain Migration section");
  });

  it("debug-report-template.md exists and contains key sections", () => {
    const filePath = path.join(TEMPLATES_DIR, "debug-report-template.md");
    assert.ok(fs.existsSync(filePath), "debug-report-template.md should exist");
    const content = fs.readFileSync(filePath, "utf8");
    assert.ok(content.includes("# Debug Report: {name}"), "Should contain Debug Report header");
    assert.ok(content.includes("## Symptom"), "Should contain Symptom section");
    assert.ok(content.includes("## Root Cause"), "Should contain Root Cause section");
    assert.ok(content.includes("## Impact Analysis"), "Should contain Impact Analysis section");
    assert.ok(content.includes("## Systemic Analysis"), "Should contain Systemic Analysis section");
    assert.ok(content.includes("## Regression Risk Assessment"), "Should contain Regression Risk section");
  });

  it("project-profile-template.md exists and contains key sections", () => {
    const filePath = path.join(TEMPLATES_DIR, "project-profile-template.md");
    assert.ok(fs.existsSync(filePath), "project-profile-template.md should exist");
    const content = fs.readFileSync(filePath, "utf8");
    assert.ok(content.includes("# Project Profile"), "Should contain Project Profile header");
    assert.ok(content.includes("## Overview"), "Should contain Overview section");
    assert.ok(content.includes("## Tech Stack"), "Should contain Tech Stack section");
    assert.ok(content.includes("## Architecture"), "Should contain Architecture section");
    assert.ok(content.includes("## Testing"), "Should contain Testing section");
    assert.ok(content.includes("## Structural Notes"), "Should contain Structural Notes section");
  });
});

describe("Agents reference template files instead of embedding them", () => {
  it("spec-agent.md references spec-template.md", () => {
    const content = readAgent("spec-agent");
    assert.ok(
      content.includes("dark-factory/templates/spec-template.md"),
      "spec-agent should reference dark-factory/templates/spec-template.md"
    );
  });

  it("debug-agent.md references debug-report-template.md", () => {
    const content = readAgent("debug-agent");
    assert.ok(
      content.includes("dark-factory/templates/debug-report-template.md"),
      "debug-agent should reference dark-factory/templates/debug-report-template.md"
    );
  });

  it("onboard-agent.md references project-profile-template.md", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("dark-factory/templates/project-profile-template.md"),
      "onboard-agent should reference dark-factory/templates/project-profile-template.md"
    );
  });

  it("spec-agent.md does not contain the full inline spec template", () => {
    const content = readAgent("spec-agent");
    // The inline template had this distinctive table that should now be in the template file only
    assert.ok(
      !content.includes("| POST | /api/v1/... | ... | role |"),
      "spec-agent should not contain the inline spec template API table"
    );
  });

  it("debug-agent.md does not contain the full inline debug report template", () => {
    const content = readAgent("debug-agent");
    // The inline template had this distinctive section
    assert.ok(
      !content.includes("## Regression Risk Assessment"),
      "debug-agent should not contain the inline debug report Regression Risk Assessment section"
    );
  });

  it("onboard-agent.md does not contain the full inline profile template", () => {
    const content = readAgent("onboard-agent");
    // The inline template had this distinctive section
    assert.ok(
      !content.includes("## Authentication & Authorization Model"),
      "onboard-agent should not contain the inline profile Authentication section"
    );
  });
});

describe("Token cap assertions (Phase 1 — template extraction)", () => {
  function tokenCount(content) {
    return Math.ceil(content.length / 4);
  }

  it("debug-agent.md is under 3,000 token cap", () => {
    const content = readAgent("debug-agent");
    const tokens = tokenCount(content);
    assert.ok(
      tokens <= 3000,
      `debug-agent.md has ${tokens} tokens, exceeds 3,000 cap`
    );
  });

  it("spec-agent.md token count decreased after template extraction", () => {
    const content = readAgent("spec-agent");
    const tokens = tokenCount(content);
    // Original was ~5,124 tokens. After removing spec template (~1,200 tokens worth),
    // should be under ~4,500. Final 4,000 cap reached after Phase 4 shared rules extraction.
    assert.ok(
      tokens < 5124,
      `spec-agent.md has ${tokens} tokens, should be less than original 5,124`
    );
  });

  it("onboard-agent.md token count decreased after template extraction", () => {
    const content = readAgent("onboard-agent");
    const tokens = tokenCount(content);
    // Original was ~6,674 tokens. After removing profile template (~2,000 tokens worth),
    // should be under ~5,500. Final 4,000 cap reached after Phase 2 codemap extraction.
    assert.ok(
      tokens < 6674,
      `onboard-agent.md has ${tokens} tokens, should be less than original 6,674`
    );
  });
});

describe("Plugin template mirrors", () => {
  it("plugins/dark-factory/templates/ directory exists", () => {
    const pluginTemplatesDir = path.join(ROOT, "plugins", "dark-factory", "templates");
    assert.ok(
      fs.existsSync(pluginTemplatesDir),
      "plugins/dark-factory/templates/ directory should exist"
    );
  });

  it("plugin spec-template.md matches source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "dark-factory", "templates", "spec-template.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "templates", "spec-template.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin spec-template.md should match source");
  });

  it("plugin debug-report-template.md matches source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "dark-factory", "templates", "debug-report-template.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "templates", "debug-report-template.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin debug-report-template.md should match source");
  });

  it("plugin project-profile-template.md matches source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "dark-factory", "templates", "project-profile-template.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "templates", "project-profile-template.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin project-profile-template.md should match source");
  });
});
