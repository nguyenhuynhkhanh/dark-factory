import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// --- Users (prime-factory accounts) ---
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),              // UUID, generated at registration
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["cto", "developer"] }).notNull().default("developer"),
  orgId: text("org_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  lastActiveAt: integer("last_active_at", { mode: "timestamp" }),
});

// --- Organizations ---
export const orgs = sqliteTable("orgs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// --- Developer installs (admin-managed API keys) ---
export const installs = sqliteTable(
  "installs",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    label: text("label").notNull().default(""),
    computerName: text("computer_name"),
    gitUserId: text("git_user_id"),
    apiKey: text("api_key").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),
  },
  (t) => [
    index("installs_org_id_idx").on(t.orgId),
  ]
);

// --- Telemetry events ---
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),              // UUID
    installId: text("install_id").notNull(),  // FK → installs.id
    orgId: text("org_id").notNull(),
    command: text("command").notNull(),       // df-intake | df-debug | df-orchestrate | df-onboard | df-cleanup
    subcommand: text("subcommand"),           // --group | --all | etc.
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    endedAt: integer("ended_at", { mode: "timestamp" }),
    durationMs: real("duration_ms"),
    outcome: text("outcome", { enum: ["success", "failed", "blocked", "abandoned"] }),
    featureName: text("feature_name"),
    roundCount: integer("round_count"),
    promptText: text("prompt_text"),          // full prompt text, time-ordered df lifecycle
    sessionId: text("session_id"),            // correlates events within one pipeline run
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    index("events_org_id_idx").on(t.orgId),
    index("events_org_id_created_at_idx").on(t.orgId, t.createdAt),
    index("events_install_id_idx").on(t.installId),
  ]
);

// --- CTO sessions ---
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
