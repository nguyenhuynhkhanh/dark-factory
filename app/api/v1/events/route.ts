/**
 * POST /api/v1/events — CLI telemetry event ingest.
 *
 * Security: authenticate via API key first; installId and orgId are resolved
 * exclusively from the API key — never from the request body.
 *
 * Validation order: auth → body parse → command → startedAt → optional fields.
 * Returns first validation error encountered (no field-accumulation).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { requireApiKey } from "@/lib/auth/requireApiKey";
import { events } from "@/db/schema";

const VALID_COMMANDS = [
  "df-intake",
  "df-debug",
  "df-orchestrate",
  "df-onboard",
  "df-cleanup",
] as const;

const VALID_OUTCOMES = [
  "success",
  "failed",
  "blocked",
  "abandoned",
] as const;

type Command = (typeof VALID_COMMANDS)[number];
type Outcome = (typeof VALID_OUTCOMES)[number];

const MAX_PROMPT_BYTES = 65_536;

function isValidCommand(value: unknown): value is Command {
  return (
    typeof value === "string" &&
    (VALID_COMMANDS as readonly string[]).includes(value)
  );
}

function isValidOutcome(value: unknown): value is Outcome {
  return (
    typeof value === "string" &&
    (VALID_OUTCOMES as readonly string[]).includes(value)
  );
}

/**
 * Truncates a string to at most MAX_PROMPT_BYTES UTF-8 bytes.
 * If the byte length is within the limit, the string is returned unchanged.
 * Truncation may split a multi-byte character; TextDecoder replaces the
 * incomplete tail with the replacement character (acceptable per EC-14).
 */
function truncateToBytes(text: string): string {
  const encoded = new TextEncoder().encode(text);
  if (encoded.length <= MAX_PROMPT_BYTES) return text;
  return new TextDecoder().decode(encoded.slice(0, MAX_PROMPT_BYTES));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Step 1: Authenticate — must be first; do not parse body before this ───
  const authResult = await requireApiKey(request);
  if (!authResult.ok) return authResult.response;
  const { installId, orgId } = authResult.context;

  // ── Step 2: Parse body ────────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Body must be a plain non-null object (not array, not primitive)
  if (
    typeof raw !== "object" ||
    raw === null ||
    Array.isArray(raw)
  ) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Cast to a record for field access — field-level narrowing below.
  const body = raw as Record<string, unknown>;

  // ── Step 3: Validate `command` ────────────────────────────────────────────
  if (!isValidCommand(body.command)) {
    return NextResponse.json({ error: "Invalid command" }, { status: 400 });
  }
  const command: Command = body.command;

  // ── Step 4: Validate `startedAt` ─────────────────────────────────────────
  if (typeof body.startedAt !== "string") {
    return NextResponse.json({ error: "Invalid startedAt" }, { status: 400 });
  }
  const startedAtDate = new Date(body.startedAt);
  if (isNaN(startedAtDate.getTime())) {
    return NextResponse.json({ error: "Invalid startedAt" }, { status: 400 });
  }
  if (startedAtDate.getTime() > Date.now() + 60 * 60 * 1000) {
    return NextResponse.json(
      { error: "startedAt is too far in the future" },
      { status: 400 }
    );
  }

  // ── Step 5: Validate optional `endedAt` ──────────────────────────────────
  let endedAtDate: Date | undefined;
  if (body.endedAt !== undefined) {
    if (typeof body.endedAt !== "string") {
      return NextResponse.json(
        { error: "Invalid endedAt" },
        { status: 400 }
      );
    }
    endedAtDate = new Date(body.endedAt);
    if (isNaN(endedAtDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid endedAt" },
        { status: 400 }
      );
    }
    if (endedAtDate.getTime() < startedAtDate.getTime()) {
      return NextResponse.json(
        { error: "endedAt must be >= startedAt" },
        { status: 400 }
      );
    }
  }

  // ── Step 6: Validate optional `durationMs` ───────────────────────────────
  let durationMs: number | undefined;
  if (body.durationMs !== undefined) {
    if (
      typeof body.durationMs !== "number" ||
      !Number.isFinite(body.durationMs) ||
      body.durationMs < 0
    ) {
      return NextResponse.json(
        { error: "Invalid durationMs" },
        { status: 400 }
      );
    }
    durationMs = body.durationMs;
  }

  // ── Step 7: Validate optional `roundCount` ───────────────────────────────
  let roundCount: number | undefined;
  if (body.roundCount !== undefined) {
    if (
      typeof body.roundCount !== "number" ||
      !Number.isInteger(body.roundCount) ||
      body.roundCount < 0
    ) {
      return NextResponse.json(
        { error: "Invalid roundCount" },
        { status: 400 }
      );
    }
    roundCount = body.roundCount;
  }

  // ── Step 8: Validate optional `outcome` ──────────────────────────────────
  let outcome: Outcome | undefined;
  if (body.outcome !== undefined) {
    if (!isValidOutcome(body.outcome)) {
      return NextResponse.json(
        { error: "Invalid outcome" },
        { status: 400 }
      );
    }
    outcome = body.outcome;
  }

  // ── Step 9: Extract remaining optional fields (no validation constraints) ─
  const subcommand =
    typeof body.subcommand === "string" ? body.subcommand : undefined;
  const featureName =
    typeof body.featureName === "string" ? body.featureName : undefined;
  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId : undefined;

  // ── Step 10: Truncate `promptText` to 64 KB if necessary ─────────────────
  let promptText: string | undefined;
  if (body.promptText !== undefined) {
    if (typeof body.promptText === "string") {
      promptText = truncateToBytes(body.promptText);
    }
    // Non-string promptText is silently ignored (treated as absent)
  }

  // ── Step 11: Generate server-side fields ─────────────────────────────────
  const id = crypto.randomUUID();
  const createdAt = new Date();

  // ── Step 12: Insert into D1 ───────────────────────────────────────────────
  const db = getDatabase();
  try {
    await db.insert(events).values({
      id,
      installId,
      orgId,
      command,
      subcommand: subcommand ?? null,
      startedAt: startedAtDate,
      endedAt: endedAtDate ?? null,
      durationMs: durationMs ?? null,
      outcome: outcome ?? null,
      featureName: featureName ?? null,
      roundCount: roundCount ?? null,
      promptText: promptText ?? null,
      sessionId: sessionId ?? null,
      createdAt,
    });
  } catch {
    // Never leak raw D1 error messages (FR-15)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  // ── Step 13: Respond ──────────────────────────────────────────────────────
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
