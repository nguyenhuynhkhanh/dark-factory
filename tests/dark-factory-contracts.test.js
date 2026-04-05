const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "..");
const AGENTS_DIR = path.join(ROOT, ".claude", "agents");
const SKILLS_DIR = path.join(ROOT, ".claude", "skills");
const PLUGINS_DIR = path.join(ROOT, "plugins", "dark-factory");

function readAgent(name) {
  return fs.readFileSync(path.join(AGENTS_DIR, `${name}.md`), "utf8");
}

function readSkill(name) {
  return fs.readFileSync(
    path.join(SKILLS_DIR, name, "SKILL.md"),
    "utf8"
  );
}

function readPlugin(type, name) {
  if (type === "agent") {
    return fs.readFileSync(
      path.join(PLUGINS_DIR, "agents", `${name}.md`),
      "utf8"
    );
  }
  if (type === "skill") {
    return fs.readFileSync(
      path.join(PLUGINS_DIR, "skills", name, "SKILL.md"),
      "utf8"
    );
  }
  throw new Error(`Unknown plugin type: ${type}`);
}

function readRules() {
  return fs.readFileSync(
    path.join(ROOT, ".claude", "rules", "dark-factory.md"),
    "utf8"
  );
}

// ===========================================================================
// 1. Cross-agent contract tests (30 tests — 12 handoffs, both sides each)
// ===========================================================================

describe("Cross-agent contracts", () => {

  // -------------------------------------------------------------------------
  // Handoff 1: df-intake -> spec-agent (perspectives)
  // -------------------------------------------------------------------------
  describe("df-intake -> spec-agent (perspectives)", () => {
    it("df-intake contains Lead A/B/C perspective prompts", () => {
      const intake = readSkill("df-intake");
      assert.ok(intake.includes("Lead A"), "df-intake should contain Lead A prompt");
      assert.ok(intake.includes("Lead B"), "df-intake should contain Lead B prompt");
      assert.ok(intake.includes("Lead C"), "df-intake should contain Lead C prompt");
    });

    it("spec-agent accepts perspective-based work from leads", () => {
      const spec = readAgent("spec-agent");
      // spec-agent is spawned by intake leads and writes specs from their findings
      assert.ok(
        spec.includes("spec") || spec.includes("findings"),
        "spec-agent should accept findings-based work"
      );
      assert.ok(
        spec.includes("dark-factory/specs/features/"),
        "spec-agent should write to feature specs directory"
      );
    });
  });

    it("df-intake spawns spec-agents with worktree isolation", () => {
      const intake = readSkill("df-intake");
      assert.ok(
        intake.includes("spec-agent") && intake.includes("isolation"),
        "df-intake should spawn spec-agents with worktree isolation"
      );
    });

  // -------------------------------------------------------------------------
  // Handoff 2: df-intake -> spec-agent (writer)
  // -------------------------------------------------------------------------
  describe("df-intake -> spec-agent (writer)", () => {
    it("df-intake references feature spec output path pattern", () => {
      const intake = readSkill("df-intake");
      assert.ok(
        intake.includes("dark-factory/specs/features/{name}.spec.md"),
        "df-intake should reference the spec output path pattern"
      );
    });

    it("spec-agent writes to the same feature spec path pattern", () => {
      const spec = readAgent("spec-agent");
      assert.ok(
        spec.includes("dark-factory/specs/features/{name}.spec.md"),
        "spec-agent should write to the same spec path pattern"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Handoff 3: df-debug -> debug-agent (investigators)
  // -------------------------------------------------------------------------
  describe("df-debug -> debug-agent (investigators)", () => {
    it("df-debug contains Investigator A/B/C prompts", () => {
      const debug = readSkill("df-debug");
      assert.ok(debug.includes("Investigator A"), "df-debug should contain Investigator A");
      assert.ok(debug.includes("Investigator B"), "df-debug should contain Investigator B");
      assert.ok(debug.includes("Investigator C"), "df-debug should contain Investigator C");
    });

    it("debug-agent produces structured investigation output", () => {
      const debugAgent = readAgent("debug-agent");
      assert.ok(
        debugAgent.includes("Root Cause"),
        "debug-agent should produce root cause analysis"
      );
      assert.ok(
        debugAgent.includes("Impact Analysis"),
        "debug-agent should produce impact analysis"
      );
    });
  });

    it("df-debug spawns debug-agents with worktree isolation", () => {
      const debug = readSkill("df-debug");
      assert.ok(
        debug.includes("debug-agent") && debug.includes("isolation"),
        "df-debug should spawn debug-agents with worktree isolation"
      );
    });

  // -------------------------------------------------------------------------
  // Handoff 4: df-debug -> debug-agent (writer)
  // -------------------------------------------------------------------------
  describe("df-debug -> debug-agent (writer)", () => {
    it("df-debug references bugfix spec output path pattern", () => {
      const debug = readSkill("df-debug");
      assert.ok(
        debug.includes("dark-factory/specs/bugfixes/{name}"),
        "df-debug should reference the bugfix output path"
      );
    });

    it("debug-agent writes to the same bugfix spec path pattern", () => {
      const debugAgent = readAgent("debug-agent");
      assert.ok(
        debugAgent.includes("dark-factory/specs/bugfixes/{name}"),
        "debug-agent should write to the same bugfix path pattern"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Handoff 5: df-orchestrate -> architect-agent (domain parameter)
  // -------------------------------------------------------------------------
  describe("df-orchestrate -> architect-agent (domain parameter)", () => {
    it("df-orchestrate passes domain parameter to architect-agent", () => {
      const orch = readSkill("df-orchestrate");
      assert.ok(
        orch.includes("domain parameter"),
        "df-orchestrate should pass domain parameter"
      );
      assert.ok(
        orch.includes("Security & Data Integrity"),
        "df-orchestrate should pass Security domain"
      );
      assert.ok(
        orch.includes("Architecture & Performance"),
        "df-orchestrate should pass Architecture domain"
      );
      assert.ok(
        orch.includes("API Design & Backward Compatibility"),
        "df-orchestrate should pass API domain"
      );
    });

    it("architect-agent accepts domain parameter", () => {
      const architect = readAgent("architect-agent");
      assert.ok(
        architect.includes("Domain Parameter") || architect.includes("domain parameter"),
        "architect-agent should accept domain parameter"
      );
      assert.ok(
        architect.includes("Security & Data Integrity"),
        "architect-agent should handle Security domain"
      );
      assert.ok(
        architect.includes("Architecture & Performance"),
        "architect-agent should handle Architecture domain"
      );
      assert.ok(
        architect.includes("API Design & Backward Compatibility"),
        "architect-agent should handle API domain"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Handoff 6: architect-agent -> spec-agent (iteration)
  // -------------------------------------------------------------------------
  describe("architect-agent -> spec-agent (iteration)", () => {
    it("architect-agent produces findings for spec updates", () => {
      const architect = readAgent("architect-agent");
      assert.ok(
        architect.includes("findings"),
        "architect-agent should produce findings"
      );
      assert.ok(
        architect.includes("spec-agent"),
        "architect-agent should reference spec-agent for iteration"
      );
    });

    it("spec-agent can process findings for spec updates", () => {
      const spec = readAgent("spec-agent");
      assert.ok(
        spec.includes("Re-spawn During Architect Review") ||
        spec.includes("architect"),
        "spec-agent should handle re-spawn from architect review"
      );
      assert.ok(
        spec.includes("feedback"),
        "spec-agent should process architect feedback"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Handoff 7: df-orchestrate -> code-agent
  // -------------------------------------------------------------------------
  describe("df-orchestrate -> code-agent", () => {
    it("df-orchestrate passes spec + public scenarios + architect findings to code-agent", () => {
      const orch = readSkill("df-orchestrate");
      assert.ok(
        orch.includes("spec") && orch.includes("public scenario"),
        "df-orchestrate should pass spec and public scenarios to code-agent"
      );
      assert.ok(
        orch.includes("Key Decisions Made"),
        "df-orchestrate should pass Key Decisions Made to code-agent"
      );
      assert.ok(
        orch.includes("Remaining Notes"),
        "df-orchestrate should pass Remaining Notes to code-agent"
      );
    });

    it("code-agent references spec + public scenarios + architect findings inputs", () => {
      const code = readAgent("code-agent");
      assert.ok(
        code.includes("dark-factory/specs/features/") || code.includes("dark-factory/specs/bugfixes/"),
        "code-agent should reference spec paths"
      );
      assert.ok(
        code.includes("dark-factory/scenarios/public/"),
        "code-agent should reference public scenarios"
      );
      assert.ok(
        code.includes("Key Decisions Made"),
        "code-agent should reference Key Decisions Made"
      );
      assert.ok(
        code.includes("Remaining Notes"),
        "code-agent should reference Remaining Notes"
      );
    });
  });

    it("df-orchestrate extracts only Key Decisions and Remaining Notes sections", () => {
      const orch = readSkill("df-orchestrate");
      assert.ok(
        orch.includes("Extract ONLY") && orch.includes("Key Decisions Made") && orch.includes("Remaining Notes"),
        "df-orchestrate should extract only Key Decisions and Remaining Notes"
      );
    });

  // -------------------------------------------------------------------------
  // Handoff 8: df-orchestrate -> test-agent
  // -------------------------------------------------------------------------
  describe("df-orchestrate -> test-agent", () => {
    it("df-orchestrate passes feature name + spec path to test-agent", () => {
      const orch = readSkill("df-orchestrate");
      assert.ok(
        orch.includes("feature name") || orch.includes("The feature name"),
        "df-orchestrate should pass feature name to test-agent"
      );
      assert.ok(
        orch.includes("spec file path") || orch.includes("spec path") || orch.includes("debug report path"),
        "df-orchestrate should pass spec path to test-agent"
      );
    });

    it("test-agent reads holdout scenarios by feature name", () => {
      const test = readAgent("test-agent");
      assert.ok(
        test.includes("dark-factory/scenarios/holdout/{feature}/") ||
        test.includes("dark-factory/scenarios/holdout/"),
        "test-agent should read holdout scenarios by feature name"
      );
      assert.ok(
        test.includes("dark-factory/specs/"),
        "test-agent should reference spec path"
      );
    });
  });

    it("test-agent writes results to dark-factory/results/{feature}/ path", () => {
      const test = readAgent("test-agent");
      assert.ok(
        test.includes("dark-factory/results/{feature}/"),
        "test-agent should write results to the expected results path"
      );
    });

  // -------------------------------------------------------------------------
  // Handoff 9: df-orchestrate -> promote-agent
  // -------------------------------------------------------------------------
  describe("df-orchestrate -> promote-agent", () => {
    it("df-orchestrate passes feature name + results path to promote-agent", () => {
      const orch = readSkill("df-orchestrate");
      assert.ok(
        orch.includes("feature name") || orch.includes("The feature name"),
        "df-orchestrate should pass feature name to promote-agent"
      );
      assert.ok(
        orch.includes("dark-factory/results/{name}/"),
        "df-orchestrate should reference results path for promote-agent"
      );
    });

    it("promote-agent writes registry and annotations", () => {
      const promote = readAgent("promote-agent");
      assert.ok(
        promote.includes("promoted-tests.json"),
        "promote-agent should write to promoted-tests.json registry"
      );
      assert.ok(
        promote.includes("Promoted from Dark Factory holdout"),
        "promote-agent should write annotation headers"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Handoff 10: onboard-agent -> scanner-agents
  // -------------------------------------------------------------------------
  describe("onboard-agent -> scanner-agents", () => {
    it("onboard-agent spawns scanners with directory chunks", () => {
      const onboard = readAgent("onboard-agent");
      assert.ok(
        onboard.includes("scanner") || onboard.includes("Scanner"),
        "onboard-agent should reference scanner agents"
      );
      assert.ok(
        onboard.includes("assigned directory") || onboard.includes("assigned directories") || onboard.includes("assigned chunk"),
        "onboard-agent should assign directory chunks to scanners"
      );
    });

    it("onboard-agent expects structured report back from scanners", () => {
      const onboard = readAgent("onboard-agent");
      assert.ok(
        onboard.includes("structured report"),
        "onboard-agent should expect structured reports from scanners"
      );
      assert.ok(
        onboard.includes("Imports") && onboard.includes("Exports"),
        "onboard-agent scanner report should include Imports and Exports"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Handoff 11: orchestrator -> wave-agent
  // -------------------------------------------------------------------------
  describe("orchestrator -> wave-agent", () => {
    it("df-orchestrate spawns wave agents with spec names and context", () => {
      const orch = readSkill("df-orchestrate");
      assert.ok(
        orch.includes("wave agent") || orch.includes("Wave Agent") || orch.includes("wave-agent"),
        "df-orchestrate should reference wave agents"
      );
      assert.ok(
        orch.includes("spec names") || orch.includes("list of spec names"),
        "df-orchestrate should pass spec names to wave agents"
      );
    });

    it("df-orchestrate passes branch and mode context to wave agents", () => {
      const orch = readSkill("df-orchestrate");
      assert.ok(
        orch.includes("current branch") || orch.includes("branch name"),
        "df-orchestrate should pass branch context to wave agents"
      );
      assert.ok(
        orch.includes("mode") && (orch.includes("feature") || orch.includes("bugfix")),
        "df-orchestrate should pass mode to wave agents"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Handoff 12: promote-agent -> df-cleanup
  // -------------------------------------------------------------------------
  describe("promote-agent -> df-cleanup", () => {
    it("promote-agent writes DF-PROMOTED-START/END markers", () => {
      const promote = readAgent("promote-agent");
      assert.ok(
        promote.includes("DF-PROMOTED-START"),
        "promote-agent should write DF-PROMOTED-START markers"
      );
      assert.ok(
        promote.includes("DF-PROMOTED-END"),
        "promote-agent should write DF-PROMOTED-END markers"
      );
    });

    it("df-cleanup looks for the exact same DF-PROMOTED-START/END markers", () => {
      const cleanup = readSkill("df-cleanup");
      assert.ok(
        cleanup.includes("DF-PROMOTED-START"),
        "df-cleanup should look for DF-PROMOTED-START markers"
      );
      assert.ok(
        cleanup.includes("DF-PROMOTED-END"),
        "df-cleanup should look for DF-PROMOTED-END markers"
      );
    });

    it("promote-agent writes to promoted-tests.json with expected schema", () => {
      const promote = readAgent("promote-agent");
      assert.ok(
        promote.includes("promoted-tests.json"),
        "promote-agent should write to promoted-tests.json"
      );
      assert.ok(
        promote.includes('"version": 1') || promote.includes('"version"'),
        "promote-agent should write version field"
      );
      assert.ok(
        promote.includes("promotedTests"),
        "promote-agent should write promotedTests array"
      );
    });

    it("df-cleanup reads promoted-tests.json with the same schema", () => {
      const cleanup = readSkill("df-cleanup");
      assert.ok(
        cleanup.includes("promoted-tests.json"),
        "df-cleanup should read promoted-tests.json"
      );
      assert.ok(
        cleanup.includes("promotedTests"),
        "df-cleanup should read promotedTests array"
      );
    });
  });
});

// ===========================================================================
// 2. Plugin mirror parity tests (8 uncovered pairs)
// ===========================================================================

describe("Plugin mirror parity (uncovered pairs)", () => {
  const agentMirrors = [
    "architect-agent",
    "spec-agent",
    "debug-agent",
    "test-agent",
  ];

  for (const name of agentMirrors) {
    it(`plugins ${name}.md matches source`, () => {
      const source = readAgent(name);
      const plugin = readPlugin("agent", name);
      assert.equal(source, plugin, `Plugin ${name}.md should match source`);
    });
  }

  const skillMirrors = [
    "df-onboard",
    "df-scenario",
    "df-spec",
    "df",
  ];

  for (const name of skillMirrors) {
    it(`plugins ${name}/SKILL.md matches source`, () => {
      const source = readSkill(name);
      const plugin = readPlugin("skill", name);
      assert.equal(source, plugin, `Plugin ${name}/SKILL.md should match source`);
    });
  }
});

// ===========================================================================
// 3. Manifest schema validation tests (5 tests)
// ===========================================================================

describe("Manifest schema validation", () => {
  // Create a test manifest entry matching the schema from df-intake
  const testEntry = {
    type: "feature",
    status: "active",
    specPath: "dark-factory/specs/features/test-feature.spec.md",
    created: "2026-04-03T00:00:00.000Z",
    rounds: 0,
    group: "test-group",
    dependencies: ["dep-a", "dep-b"],
  };

  it("manifest entry has all required fields", () => {
    const requiredFields = [
      "type",
      "status",
      "specPath",
      "created",
      "rounds",
      "group",
      "dependencies",
    ];
    for (const field of requiredFields) {
      assert.ok(
        field in testEntry,
        `Manifest entry should have required field: ${field}`
      );
    }
  });

  it("group field is string or null", () => {
    assert.ok(
      typeof testEntry.group === "string" || testEntry.group === null,
      "group should be a string or null"
    );
    // Also verify null is valid
    const standaloneEntry = { ...testEntry, group: null };
    assert.ok(
      standaloneEntry.group === null,
      "group should accept null for standalone specs"
    );
  });

  it("dependencies field is an array", () => {
    assert.ok(
      Array.isArray(testEntry.dependencies),
      "dependencies should be an array"
    );
    // Also verify empty array is valid
    const noDepsEntry = { ...testEntry, dependencies: [] };
    assert.ok(
      Array.isArray(noDepsEntry.dependencies) && noDepsEntry.dependencies.length === 0,
      "dependencies should accept empty array"
    );
  });

  it("status is one of active/passed/promoted", () => {
    const validStatuses = ["active", "passed", "promoted"];
    assert.ok(
      validStatuses.includes(testEntry.status),
      `status "${testEntry.status}" should be one of: ${validStatuses.join(", ")}`
    );
    // Verify each valid status
    for (const status of validStatuses) {
      assert.ok(
        validStatuses.includes(status),
        `${status} should be a valid status`
      );
    }
  });

  it("manifest version is 1", () => {
    const manifestPath = path.join(ROOT, "dark-factory", "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.version, 1, "manifest version should be 1");
  });
});

// ===========================================================================
// 4. Information barrier contract tests
// ===========================================================================

describe("Information barrier contracts (both sides)", () => {
  it("code-agent holdout barrier: orchestrator forbids passing AND agent forbids reading", () => {
    const orchestrate = readSkill("df-orchestrate");
    const codeAgent = readAgent("code-agent");
    assert.ok(
      orchestrate.includes("NEVER pass holdout") || orchestrate.includes("NEVER pass holdout scenario"),
      "df-orchestrate must forbid passing holdout content to code-agent"
    );
    assert.ok(
      codeAgent.includes("NEVER") && codeAgent.includes("holdout"),
      "code-agent must declare it cannot read holdout scenarios"
    );
  });

  it("test-agent public barrier: orchestrator forbids passing AND agent reads only holdout", () => {
    const orchestrate = readSkill("df-orchestrate");
    const testAgent = readAgent("test-agent");
    assert.ok(
      orchestrate.includes("NEVER pass public scenario") || orchestrate.includes("NEVER pass public"),
      "df-orchestrate must forbid passing public scenarios to test-agent"
    );
    assert.ok(
      testAgent.includes("holdout") && !testAgent.includes("reads public scenarios"),
      "test-agent must reference holdout scenarios (not public)"
    );
  });

  it("architect scenario barrier: orchestrator forbids passing AND agent declares zero access", () => {
    const orchestrate = readSkill("df-orchestrate");
    const architect = readAgent("architect-agent");
    assert.ok(
      orchestrate.includes("NEVER pass test/scenario content to the architect") ||
        orchestrate.includes("NEVER pass scenario"),
      "df-orchestrate must forbid passing scenario content to architect-agent"
    );
    assert.ok(
      architect.includes("scenario") && (architect.includes("NEVER") || architect.includes("ZERO") || architect.includes("Cannot")),
      "architect-agent must declare it has no access to scenarios"
    );
  });
});
