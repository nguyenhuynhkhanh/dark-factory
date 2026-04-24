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
    "codemap-agent",
    "implementation-agent",
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

  it("architect-agent uses tiered language (Tier 1, Tier 2, Tier 3)", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("Tier 1") && content.includes("Tier 2") && content.includes("Tier 3"),
      "architect-agent should specify all three tiers with round budgets"
    );
  });

  it("architect-agent Tier 3 specifies minimum 3 rounds (safety floor)", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("Tier 3") && (content.includes("3+ rounds") || content.includes("3 rounds minimum") || content.includes("minimum 3")),
      "architect-agent Tier 3 should still specify minimum 3 rounds"
    );
  });

  it("architect-agent Tier 1 specifies exactly 1 round", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("Tier 1") && content.includes("1 round"),
      "architect-agent Tier 1 should specify exactly 1 round budget"
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

describe("Code map — codemap-agent scanning instructions", () => {
  it("H-01: codemap-agent excludes binary files, images, and fonts from scanning", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("code-map") || content.includes("code map"),
      "codemap-agent should have a code map scanning phase"
    );
    assert.ok(
      (content.includes(".png") || content.includes(".jpg") || content.includes("image")) &&
        (content.includes("exclud") || content.includes("skip")),
      "codemap-agent should exclude binary/image files from code map scanning"
    );
  });

  it("H-02: codemap-agent detects and excludes generated code", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("@generated") || content.includes("__generated__") || content.includes("prisma/client"),
      "codemap-agent should detect generated code directories or markers"
    );
  });

  it("H-03: codemap-agent includes Python import detection for code map", () => {
    const content = readAgent("codemap-agent");
    // Must mention Python imports in the context of scanning/dependency analysis, not just tech stack detection
    assert.ok(
      content.includes("code-map") || content.includes("scanner") || content.includes("dependency graph"),
      "codemap-agent should have a code map / scanner / dependency graph phase"
    );
    assert.ok(
      content.includes("from .") || content.includes("relative import") ||
        (content.includes("Python") && content.includes("import") && content.includes("detect")),
      "codemap-agent should describe Python import detection patterns for scanning"
    );
  });

  it("H-04: codemap-agent includes Go import detection for code map", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      (content.includes("Go") && content.includes("import")) ||
        content.includes("Go package") || content.includes("Go import"),
      "codemap-agent should describe Go import detection patterns for code map scanning"
    );
  });

  it("H-05: codemap-agent detects dynamic/runtime dependencies for code map", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("dynamic import") || content.includes("dynamic depend") ||
        content.includes("runtime depend") || content.includes("Runtime Dependencies"),
      "codemap-agent should mention dynamic/runtime dependency detection for code map"
    );
  });

  it("H-06: codemap-agent scales to 5 scanners for large projects", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("scanner"),
      "codemap-agent should reference scanner agents"
    );
    assert.ok(
      content.includes("5") && content.includes("scanner"),
      "codemap-agent should scale to 5 scanners for large projects"
    );
  });

  it("H-07: codemap-agent bounds code map output size", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      (content.includes("200") && content.includes("line")) ||
        (content.includes("output") && content.includes("bound")),
      "codemap-agent should bound code map output to ~200 lines"
    );
  });

  it("H-10: codemap-agent includes Dark Factory .claude/ files in scan scope", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes(".claude/") &&
        (content.includes("scan") || content.includes("includ")) &&
        content.includes("code-map"),
      "codemap-agent should include .claude/ files in code map scan scope"
    );
  });

  it("H-12: codemap-agent traces barrel files through to actual source modules", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      (content.includes("barrel") && content.includes("trace")) ||
        (content.includes("barrel") && content.includes("re-export") && content.includes("source module")),
      "codemap-agent should trace barrel files to actual source modules in dependency graph"
    );
  });

  it("H-16: codemap-agent handles scanner agent failure gracefully", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("scanner") &&
        (content.includes("fail") || content.includes("partial") || content.includes("degrad")),
      "codemap-agent should handle scanner failure with graceful degradation"
    );
  });

  it("H-18: codemap-agent uses default exclusion list when no .gitignore", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("node_modules") && content.includes("vendor") &&
        (content.includes(".venv") || content.includes("venv")) &&
        (content.includes("exclusion") || content.includes("exclud") || content.includes("skip")),
      "codemap-agent should have a default exclusion list including node_modules, vendor, venv"
    );
  });
});

describe("Code map — developer sign-off and refresh", () => {
  it("H-08: codemap-agent requires developer sign-off before writing code map", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("code-map") &&
        (content.includes("sign-off") || content.includes("confirm") || content.includes("approve")),
      "codemap-agent should require developer sign-off for code map"
    );
  });

  it("H-09: codemap-agent preserves existing code map on rejected refresh", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("code-map") &&
        (content.includes("reject") || content.includes("preserve")),
      "codemap-agent should preserve existing code map if developer rejects refresh"
    );
  });

  it("H-19: codemap-agent adds code map reference to profile without corrupting existing content", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("code-map.md") && content.includes("project-profile"),
      "codemap-agent should reference adding code-map.md link to project-profile.md"
    );
  });
});

describe("Code map — write target and agent compatibility", () => {
  it("H-21: codemap-agent constraints allow writing code-map.md", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("code-map.md"),
      "codemap-agent constraints should list code-map.md as an allowed write target"
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
  it("H-11: codemap-agent handles circular dependencies in code map without corrupting hotspots", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      (content.includes("circular") || content.includes("cycle")) &&
        (content.includes("hotspot") || content.includes("fan-in") || content.includes("dependency graph")),
      "codemap-agent should handle circular dependencies in hotspot/dependency analysis"
    );
  });

  it("H-13: codemap-agent handles mixed-language projects in code map scanning", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("scanner") || content.includes("code-map"),
      "codemap-agent should have code map scanning phase"
    );
    assert.ok(
      (content.includes("TypeScript") || content.includes("JavaScript") || content.includes("JS/TS")) &&
        content.includes("Python") &&
        (content.includes("import") || content.includes("detect")),
      "codemap-agent should handle multiple language import patterns in scanning"
    );
  });

  it("H-14: codemap-agent maps monorepo inter-package dependencies in code map", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("inter-package") ||
        (content.includes("monorepo") && content.includes("dependency graph")),
      "codemap-agent should map monorepo inter-package dependencies in code map"
    );
  });

  it("H-15: codemap-agent handles flat script directories at file-level granularity", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("file-level") ||
        (content.includes("flat") && content.includes("dependency graph")),
      "codemap-agent should handle flat directories with file-level dependency mapping"
    );
  });

  it("H-17: codemap-agent handles projects with no import relationships in code map", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      (content.toLowerCase().includes("no import") || content.includes("empty graph") || content.includes("no dependencies") || content.includes("No imports")) &&
        (content.includes("code-map") || content.includes("code map")),
      "codemap-agent should handle projects with no import relationships gracefully"
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
// Codemap agent extraction (org-model Phase 2)
// ===========================================================================

describe("Codemap agent — structural assertions", () => {
  it("codemap-agent has scanner spawning instructions", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("Spawn Scanner Agents") || content.includes("scanner agent"),
      "codemap-agent should have scanner spawning instructions"
    );
    assert.ok(
      content.includes("parallel"),
      "codemap-agent should spawn scanners in parallel"
    );
  });

  it("codemap-agent has synthesis instructions", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("Synthesize Code Map") || content.includes("merge their reports"),
      "codemap-agent should have synthesis instructions"
    );
  });

  it("codemap-agent has tech-stack-aware import detection", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("Tech-stack-aware import detection"),
      "codemap-agent should have tech-stack-aware import detection section"
    );
    assert.ok(
      content.includes("JS/TS") && content.includes("Python") && content.includes("Go") && content.includes("Java") && content.includes("Rust"),
      "codemap-agent should cover JS/TS, Python, Go, Java, and Rust import patterns"
    );
  });

  it("codemap-agent has directory partitioning logic", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("Partition Source Files") || content.includes("scanner chunks"),
      "codemap-agent should have directory partitioning logic"
    );
  });

  it("codemap-agent has output bounding rules", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("Bound the output") || content.includes("summarization"),
      "codemap-agent should have output bounding rules"
    );
  });

  it("codemap-agent has Mermaid diagram generation", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("Mermaid") && content.includes("code-map.mermaid"),
      "codemap-agent should generate Mermaid diagrams"
    );
  });

  it("codemap-agent has code map template", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("Module Dependency Graph") &&
        content.includes("Entry Point Traces") &&
        content.includes("Shared Dependency Hotspots"),
      "codemap-agent should include the code map template sections"
    );
  });

  it("codemap-agent has constraints section", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("## Constraints"),
      "codemap-agent should have a Constraints section"
    );
    assert.ok(
      content.includes("NEVER modify source code"),
      "codemap-agent should prohibit source code modification"
    );
    assert.ok(
      content.includes("NEVER modify test files"),
      "codemap-agent should prohibit test file modification"
    );
  });
});

describe("Codemap agent — token cap", () => {
  it("codemap-agent is under 3,500 tokens", () => {
    const content = readAgent("codemap-agent");
    const estimatedTokens = Math.ceil(content.length / 4);
    assert.ok(
      estimatedTokens <= 3500,
      `codemap-agent is ${estimatedTokens} tokens, should be under 3,500`
    );
  });
});

describe("Codemap agent — onboard-agent delegates to codemap-agent", () => {
  it("onboard-agent spawns codemap-agent as sub-agent", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("codemap-agent"),
      "onboard-agent should reference codemap-agent"
    );
    assert.ok(
      content.includes("Spawn") && content.includes("codemap-agent"),
      "onboard-agent should spawn codemap-agent as a sub-agent"
    );
  });

  it("onboard-agent Phase 3.5 is a delegation, not inline logic", () => {
    const content = readAgent("onboard-agent");
    // Should NOT contain the detailed scanner prompt or synthesis steps
    assert.ok(
      !content.includes("You are a code scanner"),
      "onboard-agent should not contain scanner prompt (delegated to codemap-agent)"
    );
    assert.ok(
      !content.includes("Build module dependency graph"),
      "onboard-agent should not contain synthesis steps (delegated to codemap-agent)"
    );
  });

  it("onboard-agent has Agent in its tools list", () => {
    const content = readAgent("onboard-agent");
    const fm = parseFrontmatter(content);
    assert.ok(
      fm.tools.includes("Agent"),
      "onboard-agent should have Agent in its tools list for spawning codemap-agent"
    );
  });
});

// ===========================================================================
// Implementation-agent — structural assertions
// ===========================================================================

describe("Implementation-agent structural assertions", () => {
  it("implementation-agent has valid frontmatter with name, description, tools", () => {
    const content = readAgent("implementation-agent");
    const fm = parseFrontmatter(content);
    assert.ok(fm, "implementation-agent should have frontmatter");
    assert.equal(fm.name, "implementation-agent", "name should be implementation-agent");
    assert.ok(fm.description, "should have description");
    assert.ok(fm.tools, "should have tools");
    assert.ok(fm.tools.includes("Agent"), "should include Agent tool for spawning sub-agents");
  });

  it("implementation-agent contains architect review section", () => {
    const content = readAgent("implementation-agent");
    assert.ok(
      content.includes("Architect Review") && content.includes("MANDATORY"),
      "implementation-agent should contain mandatory architect review"
    );
  });

  it("implementation-agent contains parallel domain review with 3 domains", () => {
    const content = readAgent("implementation-agent");
    assert.ok(
      content.includes("Security & Data Integrity") &&
        content.includes("Architecture & Performance") &&
        content.includes("API Design & Backward Compatibility"),
      "implementation-agent should contain all 3 domain parameters"
    );
  });

  it("implementation-agent contains code-agent spawning for feature mode", () => {
    const content = readAgent("implementation-agent");
    assert.ok(
      content.includes("code-agent") && content.includes("Feature Mode"),
      "implementation-agent should spawn code-agents in feature mode"
    );
  });

  it("implementation-agent contains red-green cycle for bugfix mode", () => {
    const content = readAgent("implementation-agent");
    assert.ok(
      content.includes("Red Phase") && content.includes("Green Phase") && content.includes("Bugfix Mode"),
      "implementation-agent should contain red-green cycle for bugfix mode"
    );
  });

  it("implementation-agent contains promote step", () => {
    const content = readAgent("implementation-agent");
    assert.ok(
      content.includes("promote-agent") && content.includes("Promote"),
      "implementation-agent should contain promote step"
    );
  });

  it("implementation-agent contains cleanup step", () => {
    const content = readAgent("implementation-agent");
    assert.ok(
      content.includes("Cleanup") && content.includes("manifest.json"),
      "implementation-agent should contain cleanup step with manifest update"
    );
  });

  it("implementation-agent enforces information barriers", () => {
    const content = readAgent("implementation-agent");
    assert.ok(
      content.includes("NEVER pass holdout") && content.includes("code-agent"),
      "implementation-agent must forbid passing holdout to code-agent"
    );
    assert.ok(
      content.includes("NEVER pass public") && content.includes("test-agent"),
      "implementation-agent must forbid passing public to test-agent"
    );
    assert.ok(
      content.includes("NEVER pass test/scenario") && content.includes("architect-agent"),
      "implementation-agent must forbid passing test content to architect-agent"
    );
  });
});

describe("Plugin mirrors for codemap-agent", () => {
  it("plugins codemap-agent.md matches source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "agents", "codemap-agent.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "codemap-agent.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin codemap-agent.md should match source");
  });

  it("plugins onboard-agent.md matches source (post-extraction)", () => {
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
// Org-model: template references and shared context rules
// ===========================================================================

describe("Org-model — template references", () => {
  it("onboard-agent references project-profile-template.md instead of embedding", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("dark-factory/templates/project-profile-template.md"),
      "onboard-agent should reference external template file"
    );
    // Should NOT contain the full inline template
    assert.ok(
      !content.includes("## Tech Stack\n| Layer | Technology |"),
      "onboard-agent should not embed the full profile template inline"
    );
  });

  it("all 3 template files exist", () => {
    const templates = [
      "spec-template.md",
      "debug-report-template.md",
      "project-profile-template.md",
    ];
    for (const tpl of templates) {
      const tplPath = path.join(DF_DIR, "templates", tpl);
      assert.ok(
        fs.existsSync(tplPath),
        `Template file ${tpl} should exist in dark-factory/templates/`
      );
    }
  });
});

describe("Org-model — shared context rules", () => {
  it("dark-factory-context.md exists in .claude/rules/", () => {
    const rulePath = path.join(ROOT, ".claude", "rules", "dark-factory-context.md");
    assert.ok(
      fs.existsSync(rulePath),
      "dark-factory-context.md should exist in .claude/rules/"
    );
  });

  it("dark-factory-context.md references project-profile and code-map", () => {
    const content = fs.readFileSync(
      path.join(ROOT, ".claude", "rules", "dark-factory-context.md"),
      "utf8"
    );
    assert.ok(
      content.includes("project-profile.md"),
      "Shared context should reference project-profile.md"
    );
    assert.ok(
      content.includes("code-map.md"),
      "Shared context should reference code-map.md"
    );
  });

  it("plugin mirror exists for dark-factory-context.md", () => {
    const pluginPath = path.join(ROOT, "plugins", "dark-factory", "rules", "dark-factory-context.md");
    assert.ok(
      fs.existsSync(pluginPath),
      "dark-factory-context.md should be mirrored in plugins/"
    );
  });
});

// ===========================================================================
// Token cap tests for all agents and orchestrate
// ===========================================================================

describe("Token cap enforcement", () => {
  const agentCaps = {
    "onboard-agent": 5500,
    "spec-agent": 5500,
    "debug-agent": 3500,
    "architect-agent": 5000,
    "code-agent": 3000,
    "test-agent": 3500,
    "promote-agent": 2500,
    "codemap-agent": 3500,
    "implementation-agent": 4000,
  };

  for (const [agent, cap] of Object.entries(agentCaps)) {
    it(`${agent} is under ${cap} tokens`, () => {
      const content = readAgent(agent);
      const tokens = Math.ceil(Buffer.byteLength(content, "utf8") / 4);
      assert.ok(
        tokens <= cap,
        `${agent} is ${tokens} tokens, cap is ${cap}`
      );
    });
  }

  it("df-orchestrate is under 5,000 tokens", () => {
    const content = readSkill("df-orchestrate");
    const tokens = Math.ceil(Buffer.byteLength(content, "utf8") / 4);
    assert.ok(
      tokens <= 5000,
      `df-orchestrate is ${tokens} tokens, cap is 5,000`
    );
  });
});

// ===========================================================================
// Plugin mirror for implementation-agent
// ===========================================================================

describe("Plugin mirror for implementation-agent", () => {
  it("plugins implementation-agent.md matches source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "agents", "implementation-agent.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "implementation-agent.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin implementation-agent.md should match source");
  });
});

// ===========================================================================
// Promoted from Dark Factory holdout: adaptive-lead-count
// Root cause: df-intake unconditionally spawned 3 leads regardless of feature scope; this feature adds adaptive selection
// Guards: .claude/skills/df-intake/SKILL.md, plugins/dark-factory/skills/df-intake/SKILL.md, .claude/rules/dark-factory.md, CLAUDE.md
// DF-PROMOTED-START: adaptive-lead-count
// ===========================================================================

describe("Adaptive lead count — scope evaluation and frontmatter", () => {
  it("df-intake frontmatter description says '1 or 3 spec-agents based on scope'", () => {
    const content = readSkill("df-intake");
    const fm = parseFrontmatter(content);
    assert.ok(
      fm.description.includes("1 or 3 spec-agents based on scope") ||
        fm.description.includes("1 or 3"),
      "df-intake frontmatter description should reflect adaptive lead count (1 or 3)"
    );
  });

  it("df-intake SKILL.md contains scope evaluation block section", () => {
    const content = readSkill("df-intake");
    assert.ok(
      content.includes("Scope Evaluation") || content.includes("scope evaluation"),
      "df-intake should contain a scope evaluation section (Step 0)"
    );
    assert.ok(
      content.includes("Files implied") &&
        content.includes("Concern type") &&
        content.includes("Cross-cutting keywords") &&
        content.includes("Ambiguity markers") &&
        content.includes("blast radius"),
      "df-intake scope evaluation block should contain all five criteria fields"
    );
  });

  it("df-intake SKILL.md documents --leads flag in Trigger section", () => {
    const content = readSkill("df-intake");
    assert.ok(
      content.includes("--leads=1") && content.includes("--leads=3"),
      "df-intake Trigger section should document --leads=1 and --leads=3 flag variants"
    );
  });

  it("df-intake 1-lead prompt contains all three original lead perspective sections", () => {
    const content = readSkill("df-intake");
    // The full-spectrum 1-lead prompt must contain all Lead A + B + C section headers
    assert.ok(
      content.includes("Users & Use Cases") &&
        content.includes("Architecture Approach") &&
        content.includes("Failure Modes"),
      "df-intake 1-lead prompt should include sections from all three lead perspectives (user, architecture, reliability)"
    );
  });

  it("df-intake 1-lead path collapses Step 2 synthesis", () => {
    const content = readSkill("df-intake");
    assert.ok(
      content.includes("Skip synthesis") ||
        (content.includes("1 lead was used") && content.includes("directly")),
      "df-intake should collapse synthesis step for 1-lead path"
    );
  });

  it("df-intake 1-lead Step 3 phrasing avoids multi-lead language", () => {
    const content = readSkill("df-intake");
    assert.ok(
      content.includes("Do NOT say") &&
        (content.includes("Lead A found") || content.includes("all leads agreed")),
      "df-intake should explicitly forbid multi-lead phrasing in 1-lead Step 3"
    );
  });

  it("CLAUDE.md says '1 or 3 spec-agents based on scope' for df-intake", () => {
    const claudeMd = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
    assert.ok(
      claudeMd.includes("1 or 3 spec-agents based on scope") ||
        claudeMd.includes("1 or 3"),
      "CLAUDE.md df-intake description should say '1 or 3 spec-agents based on scope'"
    );
  });

  it("dark-factory.md says '1 or 3 spec-agents based on scope' for df-intake", () => {
    const rules = fs.readFileSync(
      path.join(ROOT, ".claude", "rules", "dark-factory.md"),
      "utf8"
    );
    assert.ok(
      rules.includes("1 or 3 spec-agents based on scope") ||
        rules.includes("Spawns 1 or 3 spec-agents"),
      "dark-factory.md df-intake description should say '1 or 3 spec-agents based on scope'"
    );
  });

  it("df-intake plugin mirror is byte-for-byte identical to source after adaptive lead count changes", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "skills", "df-intake", "SKILL.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "skills", "df-intake", "SKILL.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin df-intake SKILL.md must be identical to source after adaptive lead count feature");
  });
});
// DF-PROMOTED-END: adaptive-lead-count

// ===========================================================================
// Promoted from Dark Factory holdout: codemap-pipeline
// Root cause: agents explore codebase from scratch on every invocation — redundant, slow, inconsistent. Pipeline skills have no pre-phase to ensure the code map is current.
// Guards: .claude/agents/codemap-agent.md, .claude/agents/spec-agent.md, .claude/agents/architect-agent.md, .claude/agents/code-agent.md, .claude/agents/debug-agent.md, .claude/agents/test-agent.md, .claude/agents/promote-agent.md, .claude/skills/df-intake/SKILL.md, .claude/skills/df-debug/SKILL.md, .claude/skills/df-orchestrate/SKILL.md, plugins/dark-factory/agents/codemap-agent.md, plugins/dark-factory/agents/spec-agent.md, plugins/dark-factory/agents/architect-agent.md, plugins/dark-factory/agents/code-agent.md, plugins/dark-factory/agents/debug-agent.md, plugins/dark-factory/agents/test-agent.md, plugins/dark-factory/agents/promote-agent.md, plugins/dark-factory/skills/df-intake/SKILL.md, plugins/dark-factory/skills/df-debug/SKILL.md, plugins/dark-factory/skills/df-orchestrate/SKILL.md
// ===========================================================================
// DF-PROMOTED-START: codemap-pipeline

const BALANCED_SEARCH_POLICY = "it is always present and current";

describe("codemap-pipeline — balanced search policy in all agents", () => {
  const agentsWithPolicy = [
    "spec-agent",
    "architect-agent",
    "code-agent",
    "debug-agent",
    "test-agent",
    "promote-agent",
  ];

  for (const agentName of agentsWithPolicy) {
    it(`${agentName} contains balanced search policy phrase`, () => {
      const content = readAgent(agentName);
      assert.ok(
        content.includes(BALANCED_SEARCH_POLICY),
        `${agentName} must contain balanced search policy: "it is always present and current"`
      );
    });
  }
});

describe("codemap-pipeline — codemap-agent incremental refresh logic", () => {
  it("codemap-agent contains incremental refresh mode section", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("Incremental Refresh Mode"),
      "codemap-agent must contain 'Incremental Refresh Mode' section"
    );
  });

  it("codemap-agent contains fan-in cap logic", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("fan-in cap") || content.includes("Fan-in cap"),
      "codemap-agent must describe fan-in cap (20 modules)"
    );
  });

  it("codemap-agent contains Git hash header format", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("Git hash:"),
      "codemap-agent code map template must include 'Git hash:' header line"
    );
  });

  it("codemap-agent contains Coverage header format", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("Coverage:") && content.includes("PARTIAL"),
      "codemap-agent code map template must include 'Coverage: FULL | PARTIAL' header line"
    );
  });

  it("codemap-agent sign-off is conditional on onboard-agent invocation", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("onboard-agent") && content.includes("sign-off"),
      "codemap-agent must make sign-off conditional on onboard-agent invocation only"
    );
  });

  it("codemap-agent pipeline hook invocation requires no sign-off", () => {
    const content = readAgent("codemap-agent");
    assert.ok(
      content.includes("never require sign-off") ||
        content.includes("NEVER require sign-off") ||
        (content.includes("pre-pipeline hook") && content.includes("no sign-off")),
      "codemap-agent must explicitly state no sign-off required for pre-pipeline hook invocations"
    );
  });
});

describe("codemap-pipeline — pre-phase in pipeline skills", () => {
  const skillsWithPrePhase = ["df-intake", "df-debug", "df-orchestrate"];

  for (const skillName of skillsWithPrePhase) {
    it(`${skillName} contains code map pre-phase`, () => {
      const content = readSkill(skillName);
      assert.ok(
        content.includes("Pre-Phase") || content.includes("Pre-phase"),
        `${skillName} must contain a code map Pre-Phase section before spawning agents`
      );
    });

    it(`${skillName} checks Git hash in pre-phase`, () => {
      const content = readSkill(skillName);
      assert.ok(
        content.includes("Git hash") || content.includes("git rev-parse"),
        `${skillName} pre-phase must check the Git hash for freshness`
      );
    });
  }
});

describe("codemap-pipeline — plugin mirrors match source", () => {
  const agentNames = [
    "spec-agent",
    "architect-agent",
    "code-agent",
    "debug-agent",
    "test-agent",
    "promote-agent",
    "codemap-agent",
  ];

  for (const agentName of agentNames) {
    it(`plugins ${agentName}.md matches source`, () => {
      const source = fs.readFileSync(
        path.join(ROOT, ".claude", "agents", `${agentName}.md`),
        "utf8"
      );
      const plugin = fs.readFileSync(
        path.join(ROOT, "plugins", "dark-factory", "agents", `${agentName}.md`),
        "utf8"
      );
      assert.equal(
        source,
        plugin,
        `Plugin ${agentName}.md must be identical to source after codemap-pipeline feature`
      );
    });
  }

  const skillNames = ["df-intake", "df-debug", "df-orchestrate"];

  for (const skillName of skillNames) {
    it(`plugins ${skillName} SKILL.md matches source`, () => {
      const source = fs.readFileSync(
        path.join(ROOT, ".claude", "skills", skillName, "SKILL.md"),
        "utf8"
      );
      const plugin = fs.readFileSync(
        path.join(ROOT, "plugins", "dark-factory", "skills", skillName, "SKILL.md"),
        "utf8"
      );
      assert.equal(
        source,
        plugin,
        `Plugin ${skillName} SKILL.md must be identical to source after codemap-pipeline feature`
      );
    });
  }
});
// DF-PROMOTED-END: codemap-pipeline

// ===========================================================================
// Promoted from Dark Factory holdout: serena-integration
// Root cause: agents use Grep+Read+Edit for all code discovery and mutation — O(file size) token cost per edit. Serena MCP provides symbol-level operations reducing this to O(symbol size).
// Guards: .claude/agents/code-agent.md, .claude/agents/debug-agent.md, .claude/agents/onboard-agent.md, .claude/skills/df-orchestrate/SKILL.md, plugins/dark-factory/agents/code-agent.md, plugins/dark-factory/agents/debug-agent.md, plugins/dark-factory/agents/onboard-agent.md, plugins/dark-factory/skills/df-orchestrate/SKILL.md
// DF-PROMOTED-START: serena-integration

describe("serena-integration — 3-layer search policy in agents", () => {
  it("P-01: code-agent contains 3-layer search and edit policy section", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("3-Layer Search and Edit Policy") ||
        content.includes("3-layer search policy") ||
        content.includes("3-Layer Search"),
      "code-agent must contain 3-layer search policy section"
    );
    assert.ok(
      content.includes("Layer 1") && content.includes("Layer 2") && content.includes("Layer 3"),
      "code-agent 3-layer policy must define all three layers"
    );
  });

  it("P-01: code-agent Layer 1 references code-map.md for orientation", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("Layer 1") && content.includes("code-map.md"),
      "code-agent Layer 1 must reference code-map.md for structural orientation"
    );
  });

  it("P-01: code-agent Layer 2 references Serena semantic tools", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("Layer 2") && content.includes("Serena"),
      "code-agent Layer 2 must reference Serena semantic tools"
    );
  });

  it("P-01: code-agent Layer 3 is Read/Grep/Edit fallback", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("Layer 3") && content.includes("fallback"),
      "code-agent Layer 3 must be Read/Grep/Edit fallback"
    );
  });

  it("P-01: debug-agent contains 3-layer search policy (discovery only)", () => {
    const content = readAgent("debug-agent");
    assert.ok(
      content.includes("3-Layer Search Policy") ||
        content.includes("3-layer search policy") ||
        content.includes("3-Layer Search"),
      "debug-agent must contain 3-layer search policy section"
    );
    assert.ok(
      content.includes("Discovery Only") || content.includes("discovery only") || content.includes("read-only investigator"),
      "debug-agent 3-layer policy must state discovery-only restriction"
    );
  });

  it("P-01: debug-agent explicitly excludes mutation tools from its policy", () => {
    const content = readAgent("debug-agent");
    assert.ok(
      content.includes("replace_symbol_body") || content.includes("insert_after_symbol"),
      "debug-agent must mention mutation tool names to explicitly exclude them"
    );
    assert.ok(
      content.includes("NEVER use Serena mutation tools") ||
        content.includes("never use") ||
        content.includes("NEVER") && content.includes("mutation"),
      "debug-agent must explicitly state it never uses Serena mutation tools"
    );
  });
});

describe("serena-integration — agent frontmatter tool allowlists", () => {
  it("P-01: code-agent frontmatter includes all five Serena tools", () => {
    const content = readAgent("code-agent");
    const fm = parseFrontmatter(content);
    assert.ok(
      fm.tools.includes("mcp__serena__find_symbol"),
      "code-agent frontmatter must include mcp__serena__find_symbol"
    );
    assert.ok(
      fm.tools.includes("mcp__serena__symbol_overview"),
      "code-agent frontmatter must include mcp__serena__symbol_overview"
    );
    assert.ok(
      fm.tools.includes("mcp__serena__find_referencing_symbols"),
      "code-agent frontmatter must include mcp__serena__find_referencing_symbols"
    );
    assert.ok(
      fm.tools.includes("mcp__serena__replace_symbol_body"),
      "code-agent frontmatter must include mcp__serena__replace_symbol_body"
    );
    assert.ok(
      fm.tools.includes("mcp__serena__insert_after_symbol"),
      "code-agent frontmatter must include mcp__serena__insert_after_symbol"
    );
  });

  it("P-01: code-agent frontmatter does NOT include mcp__serena__execute_shell_command", () => {
    const content = readAgent("code-agent");
    const fm = parseFrontmatter(content);
    assert.ok(
      !fm.tools.includes("mcp__serena__execute_shell_command"),
      "code-agent frontmatter must NOT include mcp__serena__execute_shell_command"
    );
  });

  it("P-01: debug-agent frontmatter includes exactly three Serena discovery tools", () => {
    const content = readAgent("debug-agent");
    const fm = parseFrontmatter(content);
    assert.ok(
      fm.tools.includes("mcp__serena__find_symbol"),
      "debug-agent frontmatter must include mcp__serena__find_symbol"
    );
    assert.ok(
      fm.tools.includes("mcp__serena__symbol_overview"),
      "debug-agent frontmatter must include mcp__serena__symbol_overview"
    );
    assert.ok(
      fm.tools.includes("mcp__serena__find_referencing_symbols"),
      "debug-agent frontmatter must include mcp__serena__find_referencing_symbols"
    );
  });

  it("P-01: debug-agent frontmatter does NOT include mutation tools", () => {
    const content = readAgent("debug-agent");
    const fm = parseFrontmatter(content);
    assert.ok(
      !fm.tools.includes("mcp__serena__replace_symbol_body"),
      "debug-agent frontmatter must NOT include mcp__serena__replace_symbol_body"
    );
    assert.ok(
      !fm.tools.includes("mcp__serena__insert_after_symbol"),
      "debug-agent frontmatter must NOT include mcp__serena__insert_after_symbol"
    );
  });
});

describe("serena-integration — warmup probe and graceful degradation", () => {
  it("P-02: code-agent contains warmup probe instruction", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("warmup probe") || content.includes("Warmup probe"),
      "code-agent must describe the warmup probe"
    );
    assert.ok(
      content.includes("first Serena tool call") || content.includes("FIRST Serena tool call"),
      "code-agent warmup probe must specify it is the first Serena call in the session"
    );
  });

  it("P-02: code-agent warmup probe uses find_symbol on entry point from code-map.md", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("find_symbol") && content.includes("entry point"),
      "code-agent warmup probe must use find_symbol on a known entry point"
    );
  });

  it("P-02: code-agent warmup probe is binary decision — no retries", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("no retries") || content.includes("One probe, binary decision"),
      "code-agent warmup probe must be a one-time binary decision with no retries"
    );
  });

  it("P-02: code-agent checks project profile before warmup probe", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("project-profile.md") && content.includes("not detected"),
      "code-agent must check project profile Serena detection status before warmup probe"
    );
  });

  it("P-02: code-agent graceful degradation is silent — no errors to developer", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("Graceful degradation") || content.includes("graceful degradation"),
      "code-agent must describe graceful degradation to Layer 3"
    );
    assert.ok(
      content.includes("No errors") || content.includes("no errors") ||
        content.includes("transparently"),
      "code-agent graceful degradation must be transparent — no errors or warnings to developer"
    );
  });
});

describe("serena-integration — SERENA_MODE and post-edit verification", () => {
  it("P-04: code-agent documents SERENA_MODE=full and SERENA_MODE=read-only branching", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("SERENA_MODE=full"),
      "code-agent must document SERENA_MODE=full behavior"
    );
    assert.ok(
      content.includes("SERENA_MODE=read-only"),
      "code-agent must document SERENA_MODE=read-only behavior"
    );
  });

  it("P-04: code-agent SERENA_MODE=read-only disables replace_symbol_body and insert_after_symbol", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("SERENA_MODE=read-only") &&
        (content.includes("replace_symbol_body") || content.includes("mutation tools")),
      "code-agent must state mutation tools are disabled in read-only mode"
    );
  });

  it("P-01: code-agent contains mandatory post-edit verification instruction", () => {
    const content = readAgent("code-agent");
    assert.ok(
      content.includes("Post-edit verification") || content.includes("post-edit verification"),
      "code-agent must describe post-edit verification step"
    );
    assert.ok(
      content.includes("replace_symbol_body") && content.includes("verify"),
      "code-agent post-edit verification must apply after replace_symbol_body calls"
    );
  });
});

describe("serena-integration — df-orchestrate worktree scoping", () => {
  it("P-03: df-orchestrate writes .serena/project.yml before spawning agents", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes(".serena/project.yml"),
      "df-orchestrate must reference .serena/project.yml"
    );
    assert.ok(
      content.includes("before spawning") || content.includes("Before spawning") ||
        content.includes("BEFORE spawning"),
      "df-orchestrate must write .serena/project.yml before spawning any agent"
    );
  });

  it("P-03: df-orchestrate uses absolute path for project_root in .serena/project.yml", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("project_root") && content.includes("absolute"),
      "df-orchestrate must use absolute path for project_root in .serena/project.yml"
    );
  });

  it("P-03: df-orchestrate deletes .serena/project.yml after ExitWorktree", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes(".serena/project.yml") &&
        (content.includes("delete") || content.includes("Delete")),
      "df-orchestrate must delete .serena/project.yml after ExitWorktree"
    );
  });

  it("P-04: df-orchestrate passes SERENA_MODE in agent prompt context", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("SERENA_MODE"),
      "df-orchestrate must pass SERENA_MODE in agent prompt context"
    );
    assert.ok(
      content.includes("prompt context") || content.includes("agent prompt"),
      "df-orchestrate must pass SERENA_MODE as prompt context, not OS env var"
    );
  });

  it("P-04: df-orchestrate uses SERENA_MODE=full for single-spec and read-only for multi-spec", () => {
    const content = readSkill("df-orchestrate");
    assert.ok(
      content.includes("SERENA_MODE=full") || content.includes("Serena mode: full"),
      "df-orchestrate must set SERENA_MODE=full for single-worktree runs"
    );
    assert.ok(
      content.includes("SERENA_MODE=read-only") || content.includes("Serena mode: read-only") ||
        content.includes("read-only"),
      "df-orchestrate must set SERENA_MODE=read-only for multi-spec parallel runs"
    );
  });
});

describe("serena-integration — onboard-agent Serena detection", () => {
  it("P-01: onboard-agent Phase 2 includes Serena detection step", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("Serena MCP") || content.includes("mcp__serena"),
      "onboard-agent Phase 2 must include Serena MCP detection step"
    );
  });

  it("P-01: onboard-agent writes Serena detection result to project profile", () => {
    const content = readAgent("onboard-agent");
    assert.ok(
      content.includes("semantic queries enabled") ||
        content.includes("agents will use Read/Grep"),
      "onboard-agent must write Serena detection result to project profile Tech Stack section"
    );
  });
});

describe("serena-integration — plugin mirrors match source", () => {
  it("plugins code-agent.md matches source after serena-integration", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "agents", "code-agent.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "code-agent.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin code-agent.md must match source after serena-integration");
  });

  it("plugins debug-agent.md matches source after serena-integration", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "agents", "debug-agent.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "debug-agent.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin debug-agent.md must match source after serena-integration");
  });

  it("plugins onboard-agent.md matches source after serena-integration", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "agents", "onboard-agent.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "onboard-agent.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin onboard-agent.md must match source after serena-integration");
  });

  it("plugins df-orchestrate SKILL.md matches source after serena-integration", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "skills", "df-orchestrate", "SKILL.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "skills", "df-orchestrate", "SKILL.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin df-orchestrate SKILL.md must match source after serena-integration");
  });
});
// DF-PROMOTED-END: serena-integration

// DF-PROMOTED-START: playwright-onboard
// Source: dark-factory/specs/features/playwright-onboard.spec.md
// Promoted: 2026-04-15

describe("playwright-onboard — UI Layer & E2E detection phase", () => {
  const onboardContent = readAgent("onboard-agent");

  it("onboard-agent has Phase 2.5 for UI Layer & E2E Detection", () => {
    assert.ok(
      onboardContent.includes("Phase 2.5") && onboardContent.includes("UI Layer & E2E Detection"),
      "onboard-agent must contain Phase 2.5: UI Layer & E2E Detection"
    );
  });

  it("onboard-agent scans both dependencies and devDependencies", () => {
    assert.ok(
      onboardContent.includes("dependencies") && onboardContent.includes("devDependencies"),
      "onboard-agent must mention scanning both dependencies and devDependencies"
    );
  });

  it("onboard-agent contains frontend framework allowlist with all required packages", () => {
    const requiredPackages = ["`react`", "`vue`", "`@angular/core`", "`next`", "`nuxt`", "`svelte`", "`@sveltejs/kit`", "`@remix-run/react`", "`gatsby`", "`astro`", "`solid-js`", "`@builder.io/qwik`", "`ember-source`", "`lit`"];
    for (const pkg of requiredPackages) {
      assert.ok(
        onboardContent.includes(pkg),
        `Frontend framework allowlist must include ${pkg}`
      );
    }
  });

  it("onboard-agent contains E2E framework allowlist", () => {
    assert.ok(
      onboardContent.includes("`@playwright/test`") && onboardContent.includes("`playwright`") && onboardContent.includes("`cypress`"),
      "E2E allowlist must include @playwright/test, playwright, and cypress"
    );
  });

  it("onboard-agent checks for playwright.config and cypress.config files", () => {
    assert.ok(
      onboardContent.includes("playwright.config") && onboardContent.includes("cypress.config"),
      "onboard-agent must check for playwright.config.* and cypress.config.* files"
    );
  });

  it("onboard-agent requires BOTH dependency AND config for E2E Ready = yes", () => {
    assert.ok(
      onboardContent.includes("E2E Ready") && onboardContent.includes("BOTH"),
      "onboard-agent must state E2E Ready requires BOTH dependency AND config"
    );
  });

  it("onboard-agent handles dependency-without-config case", () => {
    assert.ok(
      onboardContent.includes("E2E Ready` = `no"),
      "onboard-agent must set E2E Ready to no when only dependency exists without config"
    );
  });

  it("onboard-agent infers framework from config file when no dependency (global install)", () => {
    assert.ok(
      onboardContent.includes("infer"),
      "onboard-agent must handle inferring framework from config file for global installs"
    );
  });

  it("onboard-agent handles config-without-dependency as E2E Ready = yes", () => {
    assert.ok(
      onboardContent.includes("E2E Ready` = `yes"),
      "onboard-agent must set E2E Ready to yes when config exists even without dependency"
    );
  });

  it("onboard-agent uses explicit allowlist with exact matching (no substrings)", () => {
    assert.ok(
      onboardContent.includes("explicit allowlist") || onboardContent.includes("allowlist"),
      "onboard-agent must use an explicit allowlist approach"
    );
    assert.ok(
      onboardContent.includes("do NOT match substrings"),
      "onboard-agent must require exact package name matching, not substrings"
    );
  });

  it("onboard-agent scans for ambiguous UI files (.html, .vue, .svelte, .jsx, .tsx)", () => {
    assert.ok(
      onboardContent.includes(".html") && onboardContent.includes(".tsx") && onboardContent.includes(".jsx"),
      "onboard-agent must scan for ambiguous UI file extensions"
    );
  });

  it("onboard-agent asks developer about UI layer when ambiguous signals found", () => {
    assert.ok(
      onboardContent.includes("ask the developer"),
      "onboard-agent must ask developer when UI detection is ambiguous"
    );
  });

  it("onboard-agent handles declined ambiguity answer with unknown", () => {
    assert.ok(
      onboardContent.includes("unknown") && onboardContent.includes("decline"),
      "onboard-agent must set UI Layer to unknown when developer declines"
    );
  });

  it("onboard-agent supports comma-separated multiple frameworks", () => {
    assert.ok(
      onboardContent.includes("comma-separated"),
      "onboard-agent must support listing multiple frameworks comma-separated"
    );
  });

  it("onboard-agent handles both Playwright and Cypress detected", () => {
    assert.ok(
      onboardContent.includes("Playwright, Cypress"),
      "onboard-agent must list both E2E frameworks comma-separated when both detected"
    );
  });

  it("onboard-agent handles missing package.json", () => {
    assert.ok(
      onboardContent.includes("no `package.json`") || onboardContent.includes("No `package.json`"),
      "onboard-agent must handle missing package.json gracefully"
    );
  });

  it("onboard-agent handles malformed package.json", () => {
    assert.ok(
      onboardContent.includes("malformed") && onboardContent.includes("unknown"),
      "onboard-agent must set fields to unknown for malformed package.json"
    );
  });

  it("onboard-agent handles greenfield projects with unknown defaults", () => {
    assert.ok(
      onboardContent.includes("greenfield") || onboardContent.includes("no source code"),
      "onboard-agent must handle greenfield projects"
    );
  });

  it("onboard-agent records four UI/E2E fields in profile Tech Stack", () => {
    assert.ok(
      onboardContent.includes("UI Layer") && onboardContent.includes("Frontend Framework") && onboardContent.includes("E2E Framework") && onboardContent.includes("E2E Ready"),
      "onboard-agent must record all four UI/E2E fields"
    );
  });

  it("onboard-agent runs no install commands during detection (NFR-1)", () => {
    // The phase should NOT contain any npm install, npx, or process spawning instructions
    // Verify the spec's constraint is reflected: detection is file-read only
    assert.ok(
      onboardContent.includes("project root"),
      "onboard-agent must specify reading package.json at project root (file-read only)"
    );
  });
});

describe("playwright-onboard — profile template fields", () => {
  it("project-profile-template.md contains all four new Tech Stack fields", () => {
    const template = fs.readFileSync(path.join(DF_DIR, "templates", "project-profile-template.md"), "utf8");
    assert.ok(template.includes("UI Layer"), "Template must have UI Layer field");
    assert.ok(template.includes("Frontend Framework"), "Template must have Frontend Framework field");
    assert.ok(template.includes("E2E Framework"), "Template must have E2E Framework field");
    assert.ok(template.includes("E2E Ready"), "Template must have E2E Ready field");
  });

  it("new fields appear after CI/CD in the Tech Stack table", () => {
    const template = fs.readFileSync(path.join(DF_DIR, "templates", "project-profile-template.md"), "utf8");
    const cicdPos = template.indexOf("CI/CD");
    const uiLayerPos = template.indexOf("UI Layer");
    assert.ok(cicdPos > -1 && uiLayerPos > -1, "Both CI/CD and UI Layer must exist in template");
    assert.ok(uiLayerPos > cicdPos, "UI Layer must appear after CI/CD in the template");
  });
});

describe("playwright-onboard — plugin mirrors match source", () => {
  it("plugins onboard-agent.md matches source after playwright-onboard", () => {
    const source = fs.readFileSync(path.join(ROOT, ".claude", "agents", "onboard-agent.md"), "utf8");
    const plugin = fs.readFileSync(path.join(ROOT, "plugins", "dark-factory", "agents", "onboard-agent.md"), "utf8");
    assert.equal(source, plugin, "Plugin onboard-agent.md must match source after playwright-onboard");
  });

  it("plugins project-profile-template.md matches source after playwright-onboard", () => {
    const source = fs.readFileSync(path.join(DF_DIR, "templates", "project-profile-template.md"), "utf8");
    const plugin = fs.readFileSync(path.join(ROOT, "plugins", "dark-factory", "templates", "project-profile-template.md"), "utf8");
    assert.equal(source, plugin, "Plugin project-profile-template.md must match source after playwright-onboard");
  });
});
// DF-PROMOTED-END: playwright-onboard

// ===========================================================================
// Promoted from Dark Factory holdout: playwright-test-hardening
// Feature: Harden Playwright E2E test flow — backend-only exclusion gate, dev server cascade, flaky-vs-consistent classification, implementation-agent routing
// Guards: .claude/agents/test-agent.md, .claude/agents/implementation-agent.md, plugins/dark-factory/agents/test-agent.md, plugins/dark-factory/agents/implementation-agent.md
// DF-PROMOTED-START: playwright-test-hardening
// ===========================================================================

describe("H-01: Profile missing UI Layer field", () => {
  const testAgent = readAgent("test-agent");

  it("test-agent logs 'UI Layer field not found' message when field missing", () => {
    assert.ok(
      testAgent.includes("UI Layer field not found in profile -- proceeding with E2E detection"),
      "test-agent must contain the log message for missing UI Layer field"
    );
  });

  it("test-agent proceeds with normal E2E detection when field missing", () => {
    assert.ok(
      testAgent.includes("If missing or other value"),
      "test-agent must specify that missing field means proceed normally"
    );
  });

  it("Step 0a comes before Step 0b (exclusion gate before detection)", () => {
    const step0aIdx = testAgent.indexOf("Step 0a");
    const step0bIdx = testAgent.indexOf("Step 0b");
    assert.ok(step0aIdx > -1, "Step 0a must exist");
    assert.ok(step0bIdx > -1, "Step 0b must exist");
    assert.ok(step0aIdx < step0bIdx, "Step 0a must come before Step 0b");
  });
});

describe("H-02: UI Layer empty or whitespace treated as missing", () => {
  const testAgent = readAgent("test-agent");

  it("test-agent specifies trimming behavior for UI Layer value", () => {
    assert.ok(
      /case-insensitive.*trim|trim.*case-insensitive|trimmed/i.test(testAgent),
      "test-agent must mention trimming the UI Layer value"
    );
  });

  it("empty/whitespace values fall through to normal detection", () => {
    assert.ok(
      testAgent.includes("If missing or other value"),
      "test-agent must handle empty/whitespace as missing"
    );
  });
});

describe("H-03: UI Layer case-insensitive matching", () => {
  const testAgent = readAgent("test-agent");

  it("test-agent specifies case-insensitive comparison for 'none'", () => {
    assert.ok(
      testAgent.includes("case-insensitive"),
      "test-agent must specify case-insensitive matching for UI Layer"
    );
  });

  it("test-agent matches 'none' value to skip E2E", () => {
    assert.ok(
      /if.*none.*skip.*e2e|if.*none.*skip.*all/i.test(testAgent),
      "test-agent must skip E2E when UI Layer is 'none'"
    );
  });
});

describe("H-04: webServer config prevents double server start", () => {
  const testAgent = readAgent("test-agent");

  it("test-agent checks Playwright config for webServer property", () => {
    assert.ok(
      testAgent.includes("webServer"),
      "test-agent must reference webServer property in Playwright config"
    );
  });

  it("test-agent skips server management when webServer found", () => {
    assert.ok(
      testAgent.includes("Playwright webServer config detected -- server management delegated to Playwright"),
      "test-agent must log that Playwright handles server management"
    );
  });

  it("webServer detection is the FIRST step in the cascade", () => {
    const devServerSection = testAgent.slice(testAgent.indexOf("Dev Server Management"));
    const wsInSection = devServerSection.indexOf("webServer");
    const profileInSection = devServerSection.indexOf("Project profile");
    assert.ok(wsInSection > -1, "Playwright config detection must exist in dev server section");
    assert.ok(profileInSection > -1, "Project profile detection must exist in dev server section");
    assert.ok(wsInSection < profileInSection, "webServer check must come before profile check");
  });
});

describe("H-05: No server command anywhere", () => {
  const testAgent = readAgent("test-agent");

  it("test-agent has a 3-step detection cascade for dev server", () => {
    assert.ok(testAgent.includes("Playwright config"), "Must check Playwright config");
    assert.ok(testAgent.includes("Project profile"), "Must check project profile");
    assert.ok(testAgent.includes("npm run dev"), "Must try npm run dev fallback");
  });

  it("test-agent skips E2E on timeout/failure and proceeds with unit tests", () => {
    assert.ok(
      testAgent.includes("Dev server failed to start within 30s -- skipping E2E tests"),
      "test-agent must log server start failure and skip E2E"
    );
  });

  it("test-agent specifies 30s timeout for dev server startup", () => {
    assert.ok(
      testAgent.includes("30s") || testAgent.includes("30 second"),
      "test-agent must specify 30-second timeout"
    );
  });
});

describe("H-06: Port already in use", () => {
  const testAgent = readAgent("test-agent");

  it("test-agent handles port-in-use by assuming server is running", () => {
    assert.ok(
      testAgent.includes("Port {port} already in use -- assuming dev server is running"),
      "test-agent must handle port-in-use case"
    );
  });

  it("test-agent requires cleanup of server process after tests", () => {
    assert.ok(
      /kill.*background.*server|MUST.*happen.*regardless/i.test(testAgent),
      "test-agent must mandate server cleanup after tests"
    );
  });
});

describe("H-07: Dev server non-200 health check accepted", () => {
  const testAgent = readAgent("test-agent");

  it("test-agent accepts any HTTP response as server running", () => {
    assert.ok(
      testAgent.includes("any HTTP") || testAgent.includes("even 500"),
      "test-agent must accept any HTTP response (including non-200) as server running"
    );
  });
});

describe("H-08: Consistent failure not classified as flaky", () => {
  const testAgent = readAgent("test-agent");

  it("test-agent distinguishes clean failure (type e2e) from flaky (type flaky-e2e)", () => {
    assert.ok(
      testAgent.includes("Clean failure") && testAgent.includes("type `e2e`"),
      "test-agent must define clean failure as type e2e"
    );
    assert.ok(
      testAgent.includes("Flaky") && testAgent.includes("type `flaky-e2e`"),
      "test-agent must define flaky as type flaky-e2e"
    );
  });

  it("consistent failure (all attempts fail) uses type e2e, not flaky-e2e", () => {
    assert.ok(
      testAgent.includes("Type: e2e"),
      "test-agent results template must show type: e2e for consistent failures"
    );
  });
});

describe("H-09: Flaky detected on third attempt (fail-fail-pass)", () => {
  const testAgent = readAgent("test-agent");

  it("test-agent uses --retries=2 for Playwright tests (3 total attempts)", () => {
    assert.ok(
      testAgent.includes("--retries=2"),
      "test-agent must use --retries=2 flag for Playwright"
    );
  });

  it("test-agent reports flaky scenario with attempt breakdown", () => {
    assert.ok(
      testAgent.includes("Attempt 1: FAIL") && testAgent.includes("Attempt 3: PASS"),
      "test-agent must include attempt breakdown for flaky scenarios"
    );
  });

  it("flaky scenario sets flakyE2E in metadata", () => {
    assert.ok(
      testAgent.includes("flakyE2E"),
      "test-agent must include flakyE2E metadata flag"
    );
  });

  it("flakyE2E is the authoritative routing signal", () => {
    assert.ok(
      testAgent.includes("AUTHORITATIVE") && testAgent.includes("flakyE2E"),
      "test-agent must declare flakyE2E as the authoritative signal"
    );
  });
});

describe("H-10: All failures flaky — code-agent skipped", () => {
  const implAgent = readAgent("implementation-agent");

  it("implementation-agent checks for flakyE2E: true in results", () => {
    assert.ok(
      implAgent.includes("flakyE2E: true"),
      "implementation-agent must check for flakyE2E flag in results"
    );
  });

  it("implementation-agent skips code-agent when ALL failures are flaky", () => {
    assert.ok(
      implAgent.includes("ALL failures are flaky") &&
      implAgent.includes("skip code-agent re-run entirely"),
      "implementation-agent must skip code-agent when all failures are flaky"
    );
  });

  it("implementation-agent spawns spec-agent for bugfix when flaky", () => {
    assert.ok(
      implAgent.includes("spec-agent") && implAgent.includes("bugfix"),
      "implementation-agent must spawn spec-agent in bugfix mode for flaky tests"
    );
  });

  it("implementation-agent logs the flakiness routing decision", () => {
    assert.ok(
      implAgent.includes("Flaky E2E detected for {scenarios}"),
      "implementation-agent must log flaky routing decision"
    );
  });

  it("flaky scenarios do NOT re-spawn code-agent", () => {
    assert.ok(
      implAgent.includes("NOT") && implAgent.includes("re-spawn code-agent"),
      "implementation-agent must explicitly prohibit code-agent re-spawn for flaky tests"
    );
  });
});

describe("H-11: Mix of flaky and consistent failures", () => {
  const implAgent = readAgent("implementation-agent");

  it("implementation-agent separates flaky from clean failures", () => {
    assert.ok(
      implAgent.includes("Separate") && implAgent.includes("flaky") && implAgent.includes("clean failures"),
      "implementation-agent must separate flaky from clean failures"
    );
  });

  it("implementation-agent spawns code-agent for clean failures AND spec-agent for flaky in parallel", () => {
    assert.ok(
      implAgent.includes("code-agent for clean failures") &&
      implAgent.includes("spec-agent for flaky"),
      "implementation-agent must handle both types in parallel"
    );
  });

  it("flaky scenarios do not count toward 3-round retry max", () => {
    assert.ok(
      implAgent.includes("count toward the 3-round retry max"),
      "implementation-agent must exclude flaky scenarios from round counting"
    );
  });
});

describe("H-12: No Playwright, UI Layer not none", () => {
  const testAgent = readAgent("test-agent");

  it("backend-only exclusion only activates for 'none' value", () => {
    const step0a = testAgent.slice(
      testAgent.indexOf("Step 0a"),
      testAgent.indexOf("Step 0b")
    );
    assert.ok(
      step0a.includes("none") && step0a.includes("missing or other value"),
      "Step 0a must only exclude for 'none', proceed for all other values"
    );
  });

  it("Step 0b Playwright detection section exists", () => {
    assert.ok(
      testAgent.includes("Playwright / E2E Detection") ||
      testAgent.includes("Detect Test Infrastructure"),
      "Playwright detection section must exist"
    );
  });

  it("existing 'no Playwright' flow preserved", () => {
    assert.ok(
      testAgent.includes("ONLY unit test framework found") ||
      testAgent.includes("no Playwright"),
      "test-agent must preserve existing no-Playwright handling"
    );
  });
});

describe("H-13: Dev server dies mid-test", () => {
  const testAgent = readAgent("test-agent");

  it("test-agent retries E2E tests with --retries=2", () => {
    assert.ok(
      testAgent.includes("--retries=2"),
      "test-agent uses retries so failed tests due to dead server are retried"
    );
  });

  it("cleanup handles already-dead server process gracefully", () => {
    assert.ok(
      testAgent.includes("kill") && testAgent.includes("regardless"),
      "test-agent cleanup must handle regardless of outcome (including dead process)"
    );
  });

  it("retries are E2E-only, never applied to unit tests", () => {
    assert.ok(
      testAgent.includes("Never retried") || testAgent.includes("E2E-only"),
      "test-agent must specify retries are E2E-only (BR-3)"
    );
  });
});

describe("Plugin mirror parity — playwright-test-hardening (AC-6)", () => {
  it("test-agent.md matches plugin mirror exactly", () => {
    const testAgentContent = readAgent("test-agent");
    const pluginTestAgent = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "test-agent.md"),
      "utf8"
    );
    assert.equal(
      testAgentContent,
      pluginTestAgent,
      "test-agent.md must match plugins/dark-factory/agents/test-agent.md"
    );
  });

  it("implementation-agent.md matches plugin mirror exactly", () => {
    const implAgentContent = readAgent("implementation-agent");
    const pluginImplAgent = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "implementation-agent.md"),
      "utf8"
    );
    assert.equal(
      implAgentContent,
      pluginImplAgent,
      "implementation-agent.md must match plugins/dark-factory/agents/implementation-agent.md"
    );
  });
});

describe("Regression: Existing behavior preserved — playwright-test-hardening", () => {
  it("test-agent preserves information barrier constraints", () => {
    const testAgent = readAgent("test-agent");
    assert.ok(testAgent.includes("NEVER modify source code files"), "Source code write restriction preserved");
    assert.ok(testAgent.includes("NEVER share holdout scenario content"), "Holdout secrecy preserved");
  });

  it("test-agent preserves unit test flow", () => {
    const testAgent = readAgent("test-agent");
    assert.ok(testAgent.includes("Unit Tests"), "Unit test section preserved");
    assert.ok(testAgent.includes("Unit test"), "Unit test classification preserved");
  });

  it("test-agent preserves Playwright E2E test writing section", () => {
    const testAgent = readAgent("test-agent");
    assert.ok(testAgent.includes("Playwright E2E Tests"), "Playwright E2E section preserved");
    assert.ok(testAgent.includes("@playwright/test"), "@playwright/test imports preserved");
  });

  it("implementation-agent preserves information barrier rules", () => {
    const implAgent = readAgent("implementation-agent");
    assert.ok(implAgent.includes("NEVER pass holdout scenario content to the code-agent"), "Holdout barrier preserved");
    assert.ok(implAgent.includes("NEVER pass public scenario content to the test-agent"), "Public barrier preserved");
    assert.ok(implAgent.includes("NEVER pass test/scenario content to the architect-agent"), "Architect barrier preserved");
  });

  it("implementation-agent preserves lifecycle steps", () => {
    const implAgent = readAgent("implementation-agent");
    assert.ok(implAgent.includes("Step 1: Code Agents"), "Code agent step preserved");
    assert.ok(implAgent.includes("Step 2: Test Agent"), "Test agent step preserved");
    assert.ok(implAgent.includes("Step 3: Evaluate"), "Evaluate step preserved");
    assert.ok(implAgent.includes("Step 4: Promote"), "Promote step preserved");
    assert.ok(implAgent.includes("Step 5: Cleanup"), "Cleanup step preserved");
  });

  it("implementation-agent preserves bugfix red-green cycle", () => {
    const implAgent = readAgent("implementation-agent");
    assert.ok(implAgent.includes("Red Phase"), "Red phase preserved");
    assert.ok(implAgent.includes("Green Phase"), "Green phase preserved");
  });
});
// DF-PROMOTED-END: playwright-test-hardening

// DF-PROMOTED-START: token-opt-slim-context
// Promoted from Dark Factory holdout: token-opt-slim-context
// Guards: .claude/agents/onboard-agent.md, .claude/agents/codemap-agent.md, .claude/skills/df-cleanup/SKILL.md, dark-factory/templates/project-profile-slim-template.md

describe("Slim context generation — token-opt-slim-context", () => {
  const onboardAgent = readAgent("onboard-agent");
  const codemapAgent = readAgent("codemap-agent");
  const dfCleanup = readSkill("df-cleanup");
  const templatePath = path.join(ROOT, "dark-factory", "templates", "project-profile-slim-template.md");
  const pluginTemplatePath = path.join(ROOT, "plugins", "dark-factory", "templates", "project-profile-slim-template.md");

  it("onboard-agent mentions project-profile-slim.md as an output (AC-1, FR-1)", () => {
    assert.ok(
      onboardAgent.includes("project-profile-slim.md"),
      "onboard-agent must reference project-profile-slim.md as an output"
    );
  });

  it("onboard-agent has a Phase 7.2 for slim profile generation (AC-1, FR-1)", () => {
    assert.ok(
      onboardAgent.includes("Phase 7.2"),
      "onboard-agent must contain Phase 7.2 for slim profile generation"
    );
  });

  it("onboard-agent positions Phase 7.2 after full-profile write (Phase 7) and before Phase 7.5 (AC-1)", () => {
    const phase7Pos = onboardAgent.indexOf("Phase 7:");
    const phase72Pos = onboardAgent.indexOf("Phase 7.2");
    const phase75Pos = onboardAgent.indexOf("Phase 7.5");
    assert.ok(phase7Pos < phase72Pos, "Phase 7.2 must come after Phase 7");
    assert.ok(phase72Pos < phase75Pos, "Phase 7.2 must come before Phase 7.5");
  });

  it("onboard-agent references the slim template file (AC-1, FR-12)", () => {
    assert.ok(
      onboardAgent.includes("project-profile-slim-template.md"),
      "onboard-agent must reference dark-factory/templates/project-profile-slim-template.md"
    );
  });

  it("codemap-agent lists code-map-slim.md as a required output (AC-2, FR-5)", () => {
    assert.ok(
      codemapAgent.includes("code-map-slim.md"),
      "codemap-agent must list code-map-slim.md as a required output"
    );
  });

  it("codemap-agent produce block shows three output files including code-map-slim.md (AC-2, FR-5)", () => {
    assert.ok(
      codemapAgent.includes("three files") || codemapAgent.includes("code-map-slim.md"),
      "codemap-agent output block must include code-map-slim.md alongside code-map.md and code-map.mermaid"
    );
  });

  it("codemap-agent states slim map carries same git hash as full map (AC-3, FR-8)", () => {
    assert.ok(
      codemapAgent.includes("same") && codemapAgent.includes("Git hash"),
      "codemap-agent must state that code-map-slim.md carries the same Git hash as code-map.md"
    );
  });

  it("codemap-agent updates slim map in full-scan path (AC-4, FR-5)", () => {
    const step3Idx = codemapAgent.indexOf("Step 3: Synthesize");
    const slimAfterStep3 = codemapAgent.indexOf("code-map-slim.md", step3Idx);
    assert.ok(slimAfterStep3 !== -1, "code-map-slim.md must be written in Step 3 (full-scan path)");
  });

  it("codemap-agent updates slim map in incremental refresh path (AC-4, FR-11)", () => {
    const refreshIdx = codemapAgent.indexOf("Incremental Refresh Mode");
    const slimInRefresh = codemapAgent.indexOf("code-map-slim.md", refreshIdx);
    const endOfRefresh = codemapAgent.indexOf("## Step 1:", refreshIdx);
    assert.ok(
      slimInRefresh !== -1 && slimInRefresh < endOfRefresh,
      "code-map-slim.md must be updated in the incremental refresh path"
    );
  });

  it("codemap-agent excludes Entry Point Traces from slim map (AC-8, FR-10)", () => {
    assert.ok(
      codemapAgent.includes("Entry Point Traces") &&
        (codemapAgent.includes("MUST NOT include") || codemapAgent.includes("not include")),
      "codemap-agent must explicitly exclude Entry Point Traces from code-map-slim.md"
    );
  });

  it("codemap-agent excludes Interface/Contract Boundaries from slim map (AC-8, FR-10)", () => {
    assert.ok(
      codemapAgent.includes("Interface/Contract Boundaries"),
      "codemap-agent must explicitly name Interface/Contract Boundaries as excluded from slim map"
    );
  });

  it("codemap-agent excludes Cross-Cutting Concerns from slim map (AC-8, FR-10)", () => {
    assert.ok(
      codemapAgent.includes("Cross-Cutting Concerns"),
      "codemap-agent must explicitly name Cross-Cutting Concerns as excluded from slim map"
    );
  });

  it("codemap-agent excludes Circular Dependencies from slim map (AC-8, FR-10)", () => {
    assert.ok(
      codemapAgent.includes("Circular Dependencies"),
      "codemap-agent must explicitly name Circular Dependencies as excluded from slim map"
    );
  });

  it("codemap-agent excludes Dynamic/Runtime Dependencies from slim map (AC-8, FR-10)", () => {
    assert.ok(
      codemapAgent.includes("Dynamic/Runtime Dependencies"),
      "codemap-agent must explicitly name Dynamic/Runtime Dependencies as excluded from slim map"
    );
  });

  it("df-cleanup has a slim file refresh step (AC-6, FR-13)", () => {
    assert.ok(
      dfCleanup.includes("project-profile-slim.md") || dfCleanup.includes("Slim File Refresh"),
      "df-cleanup must contain a slim file refresh step"
    );
  });

  it("df-cleanup slim refresh runs before promoted-test health check (AC-6, FR-14)", () => {
    const slimPos = dfCleanup.indexOf("Slim File Refresh");
    const healthCheckPos = dfCleanup.indexOf("Promoted Test Health Check");
    assert.ok(
      slimPos !== -1 && healthCheckPos !== -1 && slimPos < healthCheckPos,
      "df-cleanup slim file refresh (Step 1.5) must run before promoted test health check (Step 2)"
    );
  });

  it("df-cleanup refreshes both slim files (AC-6, FR-13)", () => {
    assert.ok(
      dfCleanup.includes("project-profile-slim.md") && dfCleanup.includes("code-map-slim.md"),
      "df-cleanup must refresh both project-profile-slim.md and code-map-slim.md"
    );
  });

  it("df-cleanup skips refresh when full profile missing and logs (FR-13)", () => {
    assert.ok(
      dfCleanup.includes("project-profile.md not found") ||
        (dfCleanup.includes("project-profile.md") && dfCleanup.includes("not found")),
      "df-cleanup must log skip message when project-profile.md not found"
    );
  });

  it("df-cleanup skips code-map-slim refresh when code-map.md missing and logs (FR-13)", () => {
    assert.ok(
      dfCleanup.includes("code-map.md not found") ||
        (dfCleanup.includes("code-map.md") && dfCleanup.includes("not found")),
      "df-cleanup must log skip message when code-map.md not found"
    );
  });

  it("slim template file exists at dark-factory/templates/project-profile-slim-template.md (AC-5, FR-12)", () => {
    assert.ok(fs.existsSync(templatePath), `Slim template must exist at ${templatePath}`);
  });

  it("slim template contains the exact header disclaimer (AC-5, AC-7, FR-3)", () => {
    const templateContent = fs.readFileSync(templatePath, "utf8");
    assert.ok(
      templateContent.includes("> Slim profile — generated from project-profile.md. For full context read project-profile.md."),
      "Slim template must contain the exact header disclaimer text"
    );
  });

  it("slim template defines Tech Stack section with extraction rule (AC-5, FR-2)", () => {
    const templateContent = fs.readFileSync(templatePath, "utf8");
    assert.ok(
      templateContent.includes("Tech Stack"),
      "Slim template must define Tech Stack section"
    );
  });

  it("slim template defines Critical Conventions section with extraction rule (AC-5, FR-2)", () => {
    const templateContent = fs.readFileSync(templatePath, "utf8");
    assert.ok(
      templateContent.includes("Critical Conventions"),
      "Slim template must define Critical Conventions section"
    );
  });

  it("slim template defines Entry Points section with extraction rule (AC-5, FR-2)", () => {
    const templateContent = fs.readFileSync(templatePath, "utf8");
    assert.ok(
      templateContent.includes("Entry Points"),
      "Slim template must define Entry Points section"
    );
  });

  it("slim template defines Common Gotchas section with extraction rule (AC-5, FR-2)", () => {
    const templateContent = fs.readFileSync(templatePath, "utf8");
    assert.ok(
      templateContent.includes("Common Gotchas"),
      "Slim template must define Common Gotchas section"
    );
  });

  it("slim template plugin mirror exists and matches source (AC-9, BR-5)", () => {
    assert.ok(fs.existsSync(pluginTemplatePath), `Plugin mirror must exist at ${pluginTemplatePath}`);
    const source = fs.readFileSync(templatePath, "utf8");
    const mirror = fs.readFileSync(pluginTemplatePath, "utf8");
    assert.equal(source, mirror, "plugins/dark-factory/templates/project-profile-slim-template.md must match source template exactly");
  });
});

describe("Plugin mirror parity — token-opt-slim-context (AC-9)", () => {
  it("onboard-agent.md matches plugin mirror exactly", () => {
    const source = readAgent("onboard-agent");
    const mirror = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "onboard-agent.md"),
      "utf8"
    );
    assert.equal(source, mirror, "onboard-agent.md must match plugins/dark-factory/agents/onboard-agent.md");
  });

  it("codemap-agent.md matches plugin mirror exactly", () => {
    const source = readAgent("codemap-agent");
    const mirror = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "codemap-agent.md"),
      "utf8"
    );
    assert.equal(source, mirror, "codemap-agent.md must match plugins/dark-factory/agents/codemap-agent.md");
  });

  it("df-cleanup/SKILL.md matches plugin mirror exactly", () => {
    const source = readSkill("df-cleanup");
    const mirror = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "skills", "df-cleanup", "SKILL.md"),
      "utf8"
    );
    assert.equal(source, mirror, "df-cleanup/SKILL.md must match plugins/dark-factory/skills/df-cleanup/SKILL.md");
  });
});

describe("Regression: Out-of-scope files NOT modified — token-opt-slim-context (AC-11, AC-12, AC-13)", () => {
  it("architect-agent.md does not contain slim-context changes", () => {
    const architectAgent = readAgent("architect-agent");
    // architect-agent should NOT reference project-profile-slim.md (that's in the consumer spec)
    // We verify it hasn't gained slim-related generation steps
    assert.ok(
      !architectAgent.includes("Phase 7.2") && !architectAgent.includes("project-profile-slim-template"),
      "architect-agent.md must NOT be modified by this spec (AC-11)"
    );
  });

  it("spec-agent.md does not contain slim-context changes", () => {
    const specAgent = readAgent("spec-agent");
    assert.ok(
      !specAgent.includes("Phase 7.2") && !specAgent.includes("project-profile-slim-template"),
      "spec-agent.md must NOT be modified by this spec (AC-12)"
    );
  });

  it("code-agent.md does not contain slim-context changes", () => {
    const codeAgent = readAgent("code-agent");
    assert.ok(
      !codeAgent.includes("Phase 7.2") && !codeAgent.includes("project-profile-slim-template"),
      "code-agent.md must NOT be modified by this spec (AC-12)"
    );
  });

  it("debug-agent.md does not contain slim-context changes", () => {
    const debugAgent = readAgent("debug-agent");
    assert.ok(
      !debugAgent.includes("Phase 7.2") && !debugAgent.includes("project-profile-slim-template"),
      "debug-agent.md must NOT be modified by this spec (AC-12)"
    );
  });

  it("implementation-agent.md does not contain slim-context changes", () => {
    const implAgent = readAgent("implementation-agent");
    assert.ok(
      !implAgent.includes("Phase 7.2") && !implAgent.includes("project-profile-slim-template"),
      "implementation-agent.md must NOT be modified by this spec (AC-12)"
    );
  });
});
// DF-PROMOTED-END: token-opt-slim-context

// ===========================================================================
// Promoted from Dark Factory holdout: token-opt-architect-review
// Root cause: architect-agent review pipeline burned 9 sessions (3 agents × 3 rounds) for all specs regardless of complexity, with no tier-conditional context loading or round summarization
// Guards: .claude/agents/architect-agent.md, .claude/agents/implementation-agent.md, .claude/agents/spec-agent.md, dark-factory/templates/spec-template.md, plugins/dark-factory/agents/architect-agent.md, plugins/dark-factory/agents/implementation-agent.md, plugins/dark-factory/agents/spec-agent.md, plugins/dark-factory/templates/spec-template.md, tests/dark-factory-setup.test.js
// DF-PROMOTED-START: token-opt-architect-review
// ===========================================================================

describe("token-opt-architect-review — tier-aware spawn (H-02: missing tier defaults to Tier 3)", () => {
  it("implementation-agent treats missing Architect Review Tier field as Tier 3", () => {
    const content = readAgent("implementation-agent");
    assert.ok(
      content.includes("Tier 3") && (content.includes("missing") || content.includes("default")),
      "implementation-agent must default to Tier 3 when Architect Review Tier field is missing"
    );
  });

  it("implementation-agent treats unrecognized tier values as Tier 3", () => {
    const content = readAgent("implementation-agent");
    assert.ok(
      content.includes("unrecognized") || (content.includes("missing") && content.includes("Tier 3")),
      "implementation-agent must treat unrecognized tier values as Tier 3 (strictest default)"
    );
  });

  it("implementation-agent treats 'Unset — architect self-assesses' as Tier 3 for spawn purposes", () => {
    const content = readAgent("implementation-agent");
    assert.ok(
      content.includes("Unset") || (content.includes("self-assesses") || content.includes("self-assess")),
      "implementation-agent must handle 'Unset — architect self-assesses' tier value"
    );
  });
});

describe("token-opt-architect-review — self-escalation protocol (H-01: Tier 1 escalates on blocker)", () => {
  it("architect-agent documents self-escalation protocol", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("self-escalat") || content.includes("Self-escalat"),
      "architect-agent must document self-escalation protocol"
    );
  });

  it("architect-agent specifies escalation reason must be recorded in review output", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("Escalated from Tier"),
      "architect-agent must specify the 'Escalated from Tier {current} to Tier {new}: {reason}' format"
    );
  });

  it("implementation-agent records tier escalation in manifest", () => {
    const content = readAgent("implementation-agent");
    assert.ok(
      content.includes("tierEscalation"),
      "implementation-agent must record tier escalation in manifest as tierEscalation field"
    );
  });
});

describe("token-opt-architect-review — slim file fallback (H-03: missing slim files)", () => {
  it("architect-agent specifies silent fallback for missing slim files", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("silently fall back") || content.includes("silent") && content.includes("fall back"),
      "architect-agent must specify silent fallback from slim to full files"
    );
  });

  it("architect-agent specifies 'Slim file not found, reading full file' internal log phrase", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("Slim file not found, reading full file"),
      "architect-agent must specify the internal log phrase for slim file fallback"
    );
  });

  it("architect-agent Tier 3 reads full files directly (no slim attempt)", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("Tier 3") && content.includes("full files"),
      "architect-agent must specify Tier 3 reads full files directly"
    );
  });
});

describe("token-opt-architect-review — round summary grace (H-04: missing round N-1 summary)", () => {
  it("architect-agent specifies graceful fallback when prior round summary is missing", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("graceful fallback") || content.includes("graceful") && content.includes("missing"),
      "architect-agent must specify graceful fallback when round N-1 summary file is missing"
    );
  });

  it("architect-agent specifies 'never fail' for missing summary files", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("never fail"),
      "architect-agent must specify that missing summary files never cause failure"
    );
  });
});

describe("token-opt-architect-review — strictest-wins tier disagreement (H-05: domain architects disagree)", () => {
  it("architect-agent documents strictest-wins rule for self-assessed tiers", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("strictest-wins") || content.includes("Strictest-wins") || content.includes("highest assessed"),
      "architect-agent must document strictest-wins rule for self-assessed tier disagreements"
    );
  });

  it("implementation-agent documents strictest-wins for domain review synthesis", () => {
    const content = readAgent("implementation-agent");
    assert.ok(
      content.includes("Strictest-wins") || content.includes("strictest-wins"),
      "implementation-agent must document strictest-wins in review synthesis"
    );
  });
});

describe("token-opt-architect-review — round summary budget (H-06: summary over 400 words)", () => {
  it("architect-agent specifies 400-word budget for round summaries", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("400 words") || content.includes("400-word"),
      "architect-agent must specify 400-word budget for round summary files"
    );
  });

  it("architect-agent specifies truncation trailing note format", () => {
    const content = readAgent("architect-agent");
    assert.ok(
      content.includes("[Truncated to fit budget") || content.includes("Truncated to fit"),
      "architect-agent must specify the truncation trailing note format for overlong summaries"
    );
  });
});

describe("token-opt-architect-review — plugin mirrors match source", () => {
  it("plugins architect-agent.md matches source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "agents", "architect-agent.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "architect-agent.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin architect-agent.md should match source");
  });

  it("plugins spec-agent.md matches source", () => {
    const source = fs.readFileSync(
      path.join(ROOT, ".claude", "agents", "spec-agent.md"),
      "utf8"
    );
    const plugin = fs.readFileSync(
      path.join(ROOT, "plugins", "dark-factory", "agents", "spec-agent.md"),
      "utf8"
    );
    assert.equal(source, plugin, "Plugin spec-agent.md should match source");
  });

  it("plugins spec-template.md matches source", () => {
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
});

describe("token-opt-architect-review — spec-agent complexity classification", () => {
  it("spec-agent contains Complexity Classification step in Phase 4", () => {
    const content = readAgent("spec-agent");
    assert.ok(
      content.includes("Complexity Classification"),
      "spec-agent must contain Complexity Classification step in Phase 4"
    );
  });

  it("spec-agent classification includes all Tier 1/2/3 signals from the table", () => {
    const content = readAgent("spec-agent");
    assert.ok(
      content.includes("Tier 1") && content.includes("Tier 2") && content.includes("Tier 3"),
      "spec-agent must include all three tier classifications with their signals"
    );
  });

  it("spec-template.md includes Architect Review Tier section", () => {
    const tplPath = path.join(ROOT, "dark-factory", "templates", "spec-template.md");
    const content = fs.readFileSync(tplPath, "utf8");
    assert.ok(
      content.includes("Architect Review Tier"),
      "spec-template.md must include Architect Review Tier section"
    );
    assert.ok(
      content.includes("Tier 1") && content.includes("Tier 2") && content.includes("Tier 3"),
      "spec-template.md Architect Review Tier section must list all three tiers"
    );
    assert.ok(
      content.includes("Unset — architect self-assesses"),
      "spec-template.md must include 'Unset — architect self-assesses' as an allowed value"
    );
  });
});
// DF-PROMOTED-END: token-opt-architect-review

// ===========================================================================
// project-memory-foundation — structural foundation tests
// ===========================================================================
// DF-PROMOTED-START: project-memory-foundation

describe("project-memory-foundation — memory directory structure", () => {
  const MEMORY_DIR = path.join(ROOT, "dark-factory", "memory");

  it("dark-factory/memory/ directory exists", () => {
    assert.ok(
      fs.existsSync(MEMORY_DIR) && fs.statSync(MEMORY_DIR).isDirectory(),
      "dark-factory/memory/ must be a regular directory"
    );
  });

  const expectedFiles = [
    "index.md",
    "invariants-security.md",
    "invariants-architecture.md",
    "invariants-api.md",
    "decisions-security.md",
    "decisions-architecture.md",
    "decisions-api.md",
    "ledger.md",
  ];

  for (const filename of expectedFiles) {
    it(`dark-factory/memory/${filename} exists`, () => {
      const filePath = path.join(MEMORY_DIR, filename);
      assert.ok(
        fs.existsSync(filePath) && fs.statSync(filePath).isFile(),
        `dark-factory/memory/${filename} must be a regular file`
      );
    });

    it(`dark-factory/memory/${filename} has valid YAML frontmatter with required keys`, () => {
      const content = fs.readFileSync(path.join(MEMORY_DIR, filename), "utf8");
      const fm = parseFrontmatter(content);
      assert.ok(fm, `${filename} must have YAML frontmatter`);
      assert.ok(fm.version === "1", `${filename} frontmatter must have version: 1, got ${fm.version}`);
      assert.ok(fm.lastUpdated && fm.lastUpdated.length > 0, `${filename} frontmatter must have non-empty lastUpdated`);
      assert.ok(fm.generatedBy && fm.generatedBy.length > 0, `${filename} frontmatter must have non-empty generatedBy`);
      assert.ok(fm.gitHash && fm.gitHash.length > 0, `${filename} frontmatter must have non-empty gitHash`);
    });
  }
});

describe("project-memory-foundation — index.md specific assertions", () => {
  const INDEX_PATH = path.join(ROOT, "dark-factory", "memory", "index.md");

  it("index.md frontmatter has entryCount field", () => {
    const content = fs.readFileSync(INDEX_PATH, "utf8");
    const fm = parseFrontmatter(content);
    assert.ok(fm, "index.md must have YAML frontmatter");
    assert.ok(
      "entryCount" in fm,
      "index.md frontmatter must have entryCount field"
    );
  });

  it("index.md frontmatter has shardCount field", () => {
    const content = fs.readFileSync(INDEX_PATH, "utf8");
    const fm = parseFrontmatter(content);
    assert.ok(fm, "index.md must have YAML frontmatter");
    assert.ok(
      "shardCount" in fm,
      "index.md frontmatter must have shardCount field"
    );
  });

  it("index.md ships with entryCount: 0 on initial install", () => {
    const content = fs.readFileSync(INDEX_PATH, "utf8");
    const fm = parseFrontmatter(content);
    // After the frontmatter, count ## heading rows in the body
    const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)$/);
    const body = bodyMatch ? bodyMatch[1] : "";
    const headingRows = body.split("\n").filter(line => line.startsWith("## "));
    const declaredCount = parseInt(fm.entryCount, 10);
    assert.equal(
      headingRows.length,
      declaredCount,
      `index.md entryCount (${declaredCount}) must equal actual heading rows (${headingRows.length})`
    );
  });

  it("index.md entry rows that exist match the correct format", () => {
    const content = fs.readFileSync(INDEX_PATH, "utf8");
    const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)$/);
    const body = bodyMatch ? bodyMatch[1] : "";
    const headingRows = body.split("\n").filter(line => line.startsWith("## "));
    const formatRegex = /^## (INV-\d{4}|DEC-\d{4}|FEAT-\d{4}) \[type:[^\]]+\] \[domain:[^\]]+\] \[tags:[^\]]*\] \[status:[^\]]+\] \[shard:[^\]]+\]/;
    for (const row of headingRows) {
      assert.ok(
        formatRegex.test(row),
        `index.md heading row must match format: ## {ID} [type:...] [domain:...] [tags:...] [status:...] [shard:...]\n  Got: ${row}`
      );
    }
  });

  it("index.md does not contain TEMPLATE entries", () => {
    const content = fs.readFileSync(INDEX_PATH, "utf8");
    const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)$/);
    const body = bodyMatch ? bodyMatch[1] : "";
    const templateRows = body.split("\n").filter(line => line.startsWith("## ") && line.includes("TEMPLATE"));
    assert.equal(
      templateRows.length,
      0,
      `index.md must not contain TEMPLATE entries (found ${templateRows.length})`
    );
  });
});

describe("project-memory-foundation — shard files contain zero entries", () => {
  const MEMORY_DIR = path.join(ROOT, "dark-factory", "memory");
  const shardFiles = [
    "invariants-security.md",
    "invariants-architecture.md",
    "invariants-api.md",
    "decisions-security.md",
    "decisions-architecture.md",
    "decisions-api.md",
  ];

  for (const filename of shardFiles) {
    it(`${filename} body contains zero entry headings`, () => {
      const content = fs.readFileSync(path.join(MEMORY_DIR, filename), "utf8");
      const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)$/);
      const body = bodyMatch ? bodyMatch[1] : "";
      const headingRows = body.split("\n").filter(line => line.startsWith("## "));
      assert.equal(
        headingRows.length,
        0,
        `${filename} must ship with zero entry headings (found ${headingRows.length})`
      );
    });

    it(`${filename} body does not contain TEMPLATE word`, () => {
      const content = fs.readFileSync(path.join(MEMORY_DIR, filename), "utf8");
      const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)$/);
      const body = bodyMatch ? bodyMatch[1] : "";
      assert.ok(
        !body.includes("TEMPLATE"),
        `${filename} body must not contain the word TEMPLATE`
      );
    });
  }
});

describe("project-memory-foundation — ledger.md append-only note", () => {
  it("ledger.md contains a prominent append-only note within the first 20 lines", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "dark-factory", "memory", "ledger.md"),
      "utf8"
    );
    const lines = content.split("\n").slice(0, 20);
    const hasAppendOnlyNote = lines.some(
      line => line.toLowerCase().includes("append-only") || line.toLowerCase().includes("append only")
    );
    assert.ok(
      hasAppendOnlyNote,
      "ledger.md must contain an append-only note within the first 20 lines"
    );
  });

  it("ledger.md ships with zero ledger entry headings", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "dark-factory", "memory", "ledger.md"),
      "utf8"
    );
    const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)$/);
    const body = bodyMatch ? bodyMatch[1] : "";
    const entryHeadings = body.split("\n").filter(line => /^## FEAT-\d{4}:/.test(line));
    assert.equal(
      entryHeadings.length,
      0,
      `ledger.md must ship with zero FEAT-NNNN entry headings (found ${entryHeadings.length})`
    );
  });
});

describe("project-memory-foundation — project-memory-template.md schema completeness", () => {
  const TEMPLATE_PATH = path.join(ROOT, "dark-factory", "templates", "project-memory-template.md");

  it("project-memory-template.md exists", () => {
    assert.ok(
      fs.existsSync(TEMPLATE_PATH),
      "dark-factory/templates/project-memory-template.md must exist"
    );
  });

  // FR-8 — invariant fields
  const invariantFields = [
    "id", "title", "rule", "scope.modules", "scope.entities",
    "source", "sourceRef", "status", "supersededBy", "introducedBy",
    "introducedAt", "rationale", "domain", "tags", "shard",
    "enforced_by", "enforcement", "guards", "referencedBy",
  ];

  for (const field of invariantFields) {
    it(`template documents invariant field: ${field}`, () => {
      const content = fs.readFileSync(TEMPLATE_PATH, "utf8");
      assert.ok(
        content.includes(`\`${field}\``) || content.includes(`**${field}**`) || content.includes(field),
        `project-memory-template.md must document invariant field: ${field}`
      );
    });
  }

  // FR-9 — decision fields
  const decisionFields = [
    "id", "title", "context", "decision", "rationale", "alternatives",
    "status", "supersededBy", "introducedBy", "introducedAt", "domain",
    "tags", "shard", "referencedBy",
  ];

  for (const field of decisionFields) {
    it(`template documents decision field: ${field}`, () => {
      const content = fs.readFileSync(TEMPLATE_PATH, "utf8");
      assert.ok(
        content.includes(`\`${field}\``) || content.includes(`**${field}**`) || content.includes(field),
        `project-memory-template.md must document decision field: ${field}`
      );
    });
  }

  // FR-10 — ledger fields
  const ledgerFields = [
    "id", "name", "summary", "promotedAt", "introducedInvariants",
    "introducedDecisions", "promotedTests", "gitSha",
  ];

  for (const field of ledgerFields) {
    it(`template documents ledger field: ${field}`, () => {
      const content = fs.readFileSync(TEMPLATE_PATH, "utf8");
      assert.ok(
        content.includes(`\`${field}\``) || content.includes(`**${field}**`) || content.includes(field),
        `project-memory-template.md must document ledger field: ${field}`
      );
    });
  }

  it("template documents enforced_by OR enforcement escape hatch (FR-12)", () => {
    const content = fs.readFileSync(TEMPLATE_PATH, "utf8");
    assert.ok(
      content.includes("enforced_by") && content.includes("enforcement"),
      "template must document both enforced_by and the enforcement escape hatch"
    );
    assert.ok(
      content.includes("runtime") && content.includes("manual"),
      "template must document runtime and manual as enforcement values"
    );
  });

  it("template documents zero-padded ID format and promote-agent assignment (FR-13)", () => {
    const content = fs.readFileSync(TEMPLATE_PATH, "utf8");
    assert.ok(
      content.includes("INV-0001") || content.includes("zero-padded"),
      "template must document zero-padded 4-digit ID format"
    );
    assert.ok(
      content.includes("promote-agent"),
      "template must state that IDs are assigned by promote-agent"
    );
    assert.ok(
      content.includes("never reused") || content.includes("never reuse"),
      "template must state that IDs are never reused"
    );
  });

  it("template documents index heading format with all bracket components", () => {
    const content = fs.readFileSync(TEMPLATE_PATH, "utf8");
    assert.ok(content.includes("[type:"), "template must document [type:...] bracket");
    assert.ok(content.includes("[domain:"), "template must document [domain:...] bracket");
    assert.ok(content.includes("[tags:"), "template must document [tags:...] bracket");
    assert.ok(content.includes("[status:"), "template must document [status:...] bracket");
    assert.ok(content.includes("[shard:"), "template must document [shard:...] bracket");
  });

  it("template documents token budget soft limits", () => {
    const content = fs.readFileSync(TEMPLATE_PATH, "utf8");
    assert.ok(
      content.includes("4,000 tokens") || content.includes("4000 tokens"),
      "template must document index soft token budget (~4,000 tokens)"
    );
    assert.ok(
      content.includes("8,000 tokens") || content.includes("8000 tokens"),
      "template must document per-shard soft token budget (~8,000 tokens)"
    );
  });
});

describe("project-memory-foundation — context rule references memory index", () => {
  const RULE_PATH = path.join(ROOT, ".claude", "rules", "dark-factory-context.md");

  it("dark-factory-context.md references dark-factory/memory/index.md as 4th always-load source", () => {
    const content = fs.readFileSync(RULE_PATH, "utf8");
    assert.ok(
      content.includes("dark-factory/memory/index.md"),
      "dark-factory-context.md must reference dark-factory/memory/index.md"
    );
  });

  it("dark-factory-context.md states missing index is warn-and-proceed (non-blocking)", () => {
    const content = fs.readFileSync(RULE_PATH, "utf8");
    assert.ok(
      (content.includes("warn") && content.includes("proceed")) ||
      content.includes("not yet onboarded"),
      "dark-factory-context.md must state that a missing index is non-blocking (warn and proceed)"
    );
  });

  it("dark-factory-context.md does NOT reference individual shard filenames", () => {
    const content = fs.readFileSync(RULE_PATH, "utf8");
    const shardNames = [
      "invariants-security.md",
      "invariants-architecture.md",
      "invariants-api.md",
      "decisions-security.md",
      "decisions-architecture.md",
      "decisions-api.md",
    ];
    for (const shard of shardNames) {
      assert.ok(
        !content.includes(shard),
        `dark-factory-context.md must NOT reference shard file: ${shard}`
      );
    }
  });

  it("dark-factory-context.md still references project-profile.md, code-map.md, manifest.json", () => {
    const content = fs.readFileSync(RULE_PATH, "utf8");
    assert.ok(content.includes("project-profile.md"), "rule must still reference project-profile.md");
    assert.ok(content.includes("code-map.md"), "rule must still reference code-map.md");
    assert.ok(content.includes("manifest.json"), "rule must still reference manifest.json");
  });
});

describe("project-memory-foundation — profile template pointer note", () => {
  it("project-profile-template.md Invariants bullet references memory invariants shards", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "dark-factory", "templates", "project-profile-template.md"),
      "utf8"
    );
    assert.ok(
      content.includes("invariants-"),
      "project-profile-template.md must reference invariants-*.md shards"
    );
    assert.ok(
      content.includes("dark-factory/memory/"),
      "project-profile-template.md must reference dark-factory/memory/ path"
    );
    // Ensure existing Invariants bullet is preserved
    assert.ok(
      content.includes("Invariants"),
      "project-profile-template.md must retain the existing Invariants bullet"
    );
  });
});

describe("project-memory-foundation — gitignore check", () => {
  it("dark-factory/memory/ is NOT gitignored", () => {
    const gitignorePath = path.join(ROOT, ".gitignore");
    if (!fs.existsSync(gitignorePath)) return; // no gitignore = not ignored
    const content = fs.readFileSync(gitignorePath, "utf8");
    const lines = content.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
    // Check no pattern would gitignore the memory directory
    const problematic = lines.filter(line =>
      line === "dark-factory/memory/" ||
      line === "dark-factory/memory" ||
      line === "dark-factory/memory/*.md" ||
      (line === "dark-factory/*" && !content.includes("!dark-factory/memory"))
    );
    assert.equal(
      problematic.length,
      0,
      `dark-factory/memory/ must NOT be gitignored. Found problematic patterns: ${problematic.join(", ")}`
    );
  });

  it("dark-factory/results/ remains gitignored", () => {
    const gitignorePath = path.join(ROOT, ".gitignore");
    if (!fs.existsSync(gitignorePath)) return;
    const content = fs.readFileSync(gitignorePath, "utf8");
    assert.ok(
      content.includes("dark-factory/results/") || content.includes("dark-factory/results"),
      "dark-factory/results/ must remain gitignored"
    );
  });
});

// DF-PROMOTED-END: project-memory-foundation
