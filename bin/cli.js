#!/usr/bin/env node

/**
 * Dark Factory CLI
 *
 * Usage:
 *   npx dark-factory init          Install Dark Factory into current project
 *   npx dark-factory update        Update agents/skills/rules to latest version
 *   npx dark-factory init --dir /path/to/project
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

function log(msg) { console.log(msg); }
function info(msg) { console.log(`  ${GREEN}+${RESET} ${msg}`); }
function update(msg) { console.log(`  ${YELLOW}~${RESET} ${msg}`); }
function skip(msg) { console.log(`  ${DIM}-${RESET} ${DIM}${msg}${RESET}`); }

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

function touchGitkeep(dirPath) {
  ensureDir(dirPath);
  const keepPath = path.join(dirPath, ".gitkeep");
  if (!fs.existsSync(keepPath)) {
    fs.writeFileSync(keepPath, "", "utf8");
  }
}

function copyFileWithLog(src, dest) {
  const rel = path.relative(process.cwd(), dest);
  ensureDir(path.dirname(dest));

  if (fs.existsSync(dest)) {
    const existing = fs.readFileSync(dest, "utf8");
    const incoming = fs.readFileSync(src, "utf8");
    if (existing === incoming) {
      skip(`${rel} (unchanged)`);
      return;
    }
    update(rel);
  } else {
    info(rel);
  }

  fs.copyFileSync(src, dest);
}

function copyDirRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileWithLog(srcPath, destPath);
    }
  }
}

// ---------------------------------------------------------------------------
// .gitignore management
// ---------------------------------------------------------------------------

function updateGitignore(dir) {
  const gitignorePath = path.join(dir, ".gitignore");
  let content = "";
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, "utf8");
  }

  let modified = false;

  // .claude selective tracking
  const claudeEntries = [
    "/.claude/*",
    "!/.claude/agents/",
    "!/.claude/rules/",
    "!/.claude/skills/",
  ];

  const claudeLineRegex = /^[/#]*\s*\.?\/?\.claude\s*$/m;
  if (claudeLineRegex.test(content)) {
    content = content.replace(claudeLineRegex, claudeEntries.join("\n"));
    modified = true;
  } else if (!content.includes("/.claude/*")) {
    content += "\n# Claude Code — selectively track agents, rules, and skills\n" + claudeEntries.join("\n") + "\n";
    modified = true;
  }

  // Ensure !/.claude/rules/ is present (may be missing from older installs)
  if (content.includes("/.claude/*") && !content.includes("!/.claude/rules/")) {
    content = content.replace("!/.claude/skills/", "!/.claude/rules/\n!/.claude/skills/");
    modified = true;
  }

  // dark-factory/results
  if (!content.includes("dark-factory/results")) {
    content += "\n# Dark Factory results (local test output)\ndark-factory/results/\n";
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(gitignorePath, content, "utf8");
    update(".gitignore");
  } else {
    skip(".gitignore (already configured)");
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function cmdInit(targetDir, opts = {}) {
  const templateDir = path.join(__dirname, "..", "template");

  log("");
  log(`${BOLD}Dark Factory${RESET} — installing into ${CYAN}${targetDir}${RESET}`);
  log("");

  // 1. Copy .claude/ (agents, skills, rules) — always overwrite to latest
  log(`${BOLD}Agents & Skills${RESET}`);
  copyDirRecursive(
    path.join(templateDir, ".claude"),
    path.join(targetDir, ".claude"),
  );

  // 2. Create dark-factory/ working directories — never overwrite existing content
  log("");
  log(`${BOLD}Working directories${RESET}`);
  const dfDir = path.join(targetDir, "dark-factory");
  const dirs = [
    "specs/features",
    "specs/bugfixes",
    "scenarios/public",
    "scenarios/holdout",
    "results",
    "archive",
  ];
  for (const d of dirs) {
    const full = path.join(dfDir, d);
    if (ensureDir(full)) {
      info(`dark-factory/${d}/`);
    } else {
      skip(`dark-factory/${d}/ (exists)`);
    }
    touchGitkeep(full);
  }

  // 3. Create manifest.json if missing
  const manifestPath = path.join(dfDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, JSON.stringify({ version: 1, features: {} }, null, 2) + "\n", "utf8");
    info("dark-factory/manifest.json");
  } else {
    skip("dark-factory/manifest.json (exists)");
  }

  // 4. Update .gitignore
  log("");
  log(`${BOLD}Git config${RESET}`);
  updateGitignore(targetDir);

  // Done
  log("");
  log(`${GREEN}${BOLD}Done!${RESET} Dark Factory is ready.`);
  log("");
  log(`${BOLD}Next steps:${RESET}`);
  log(`  1. Run ${CYAN}/df-onboard${RESET} in Claude Code to map your project`);
  log(`  2. Describe a feature or bug — Dark Factory activates automatically`);
  log(`  3. Or use ${CYAN}/df {description}${RESET} explicitly`);
  log("");
}

function cmdUpdate(targetDir) {
  const templateDir = path.join(__dirname, "..", "template");

  log("");
  log(`${BOLD}Dark Factory${RESET} — updating agents, skills & rules in ${CYAN}${targetDir}${RESET}`);
  log("");

  log(`${BOLD}Agents & Skills${RESET}`);
  copyDirRecursive(
    path.join(templateDir, ".claude"),
    path.join(targetDir, ".claude"),
  );

  // Also update .gitignore in case new entries were added
  log("");
  log(`${BOLD}Git config${RESET}`);
  updateGitignore(targetDir);

  log("");
  log(`${GREEN}${BOLD}Updated!${RESET} Agents, skills, and rules are now at the latest version.`);
  log(`  Your specs, scenarios, and manifest were not touched.`);
  log("");
}

function cmdHelp() {
  log(`
${BOLD}Dark Factory${RESET} — AI-powered development pipeline for Claude Code

${BOLD}Usage:${RESET}
  npx dark-factory init              Install into current project
  npx dark-factory update            Update agents/skills/rules to latest
  npx dark-factory help              Show this help

${BOLD}Options:${RESET}
  --dir <path>                       Target directory (default: current dir)

${BOLD}What gets installed:${RESET}
  .claude/agents/     7 specialized AI agents
  .claude/skills/     8 slash command skills (/df, /df-intake, etc.)
  .claude/rules/      Auto-detection rules
  dark-factory/       Working directory (specs, scenarios, results)

${BOLD}After install:${RESET}
  1. Open Claude Code in your project
  2. Run /df-onboard to map your project
  3. Just describe what you need — Dark Factory activates automatically
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  let command = null;
  let targetDir = process.cwd();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dir" && args[i + 1]) {
      targetDir = path.resolve(args[++i]);
    } else if (args[i] === "--help" || args[i] === "-h") {
      command = "help";
    } else if (!args[i].startsWith("-")) {
      command = args[i];
    }
  }

  switch (command) {
    case "init":
      cmdInit(targetDir);
      break;
    case "update":
      cmdUpdate(targetDir);
      break;
    case "help":
      cmdHelp();
      break;
    default:
      // No command = init (most common use case)
      if (!command) {
        cmdInit(targetDir);
      } else {
        log(`Unknown command: ${command}`);
        log(`Run 'npx dark-factory help' for usage.`);
        process.exit(1);
      }
  }
}

main();
