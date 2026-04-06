/**
 * GET /api/v1/dashboard/events
 *
 * Returns a paginated, filtered list of telemetry events for the authenticated
 * CTO's org. orgId is always sourced from the session — never from query params.
 *
 * promptText is NEVER returned. Explicit column list in SELECT.
 * Cache-Control: no-store on all responses (success and error).
 */

import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { getDatabase } from "@/lib/db";
import { events, installs } from "@/db/schema";

// ─── Enums ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NO_STORE = { "Cache-Control": "no-store" };

function errorResponse(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

/**
 * Validates that a string is ISO 8601 format (must contain 'T') and parses to
 * a valid Date. Returns the Date on success, null on failure.
 *
 * Rejects human-readable formats like "April 5 2026" and Unix integer strings.
 */
function parseIsoDate(value: string): Date | null {
  // Require ISO 8601: must contain 'T' separator between date and time.
  if (!value.includes("T")) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Auth — must run before any D1 access (NFR-3).
  const authResult = await requireCtoSession();
  if (!authResult.ok) {
    // Preserve the original status (401 or 500) but add no-store header.
    const body = await authResult.response.json();
    return NextResponse.json(body, {
      status: authResult.response.status,
      headers: NO_STORE,
    });
  }

  const { orgId } = authResult.session;

  // 2. Parse query params.
  const { searchParams } = request.nextUrl;

  const installIdParam = searchParams.get("installId") ?? undefined;
  const commandParam = searchParams.get("command") ?? undefined;
  const outcomeParam = searchParams.get("outcome") ?? undefined;
  const fromParam = searchParams.get("from") ?? undefined;
  const toParam = searchParams.get("to") ?? undefined;
  const pageParam = searchParams.get("page") ?? undefined;
  const limitParam = searchParams.get("limit") ?? undefined;

  // 3. Validate enums.
  if (
    commandParam !== undefined &&
    !(VALID_COMMANDS as readonly string[]).includes(commandParam)
  ) {
    return errorResponse(400, "Invalid command value");
  }

  if (
    outcomeParam !== undefined &&
    !(VALID_OUTCOMES as readonly string[]).includes(outcomeParam)
  ) {
    return errorResponse(400, "Invalid outcome value");
  }

  // 4. Parse and validate dates.
  // Default from = now - 7 days (always applied — BR-2).
  const defaultFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  let fromDate: Date = defaultFrom;
  let toDate: Date | undefined;

  if (fromParam !== undefined) {
    const parsed = parseIsoDate(fromParam);
    if (parsed === null) {
      return errorResponse(400, "Invalid date format for from/to");
    }
    fromDate = parsed;
  }

  if (toParam !== undefined) {
    const parsed = parseIsoDate(toParam);
    if (parsed === null) {
      return errorResponse(400, "Invalid date format for from/to");
    }
    toDate = parsed;
  }

  // FR-6, BR-5: from > to is an error (but from == to is valid — EC-3).
  if (toDate !== undefined && fromDate.getTime() > toDate.getTime()) {
    return errorResponse(400, "from must not be after to");
  }

  // 5. Normalize pagination (FR-8, BR-4).
  let page = pageParam !== undefined ? parseInt(pageParam, 10) : 1;
  let limit = limitParam !== undefined ? parseInt(limitParam, 10) : 50;

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 1;
  if (limit > 100) limit = 100;

  const offset = (page - 1) * limit;

  // 6. Build WHERE conditions (NFR-4 — parameterized only).
  // org_id is ALWAYS the first condition (FR-1, BR-1).
  const conditions: SQL[] = [eq(events.orgId, orgId)];

  if (installIdParam !== undefined) {
    conditions.push(eq(events.installId, installIdParam));
  }

  if (commandParam !== undefined) {
    conditions.push(eq(events.command, commandParam));
  }

  if (outcomeParam !== undefined) {
    // outcomeParam is validated against enum above; cast is safe.
    conditions.push(
      eq(events.outcome, outcomeParam as (typeof VALID_OUTCOMES)[number])
    );
  }

  // from is always set (defaultFrom or user-supplied).
  conditions.push(gte(events.startedAt, fromDate));

  if (toDate !== undefined) {
    conditions.push(lte(events.startedAt, toDate));
  }

  const whereClause = and(...conditions);

  // 7. Execute data + count queries in parallel (FR-10, NFR-1).
  const db = getDatabase();

  try {
    const [dataRows, countRows] = await Promise.all([
      // Data query — explicit column list; promptText excluded (FR-11, BR-7).
      db
        .select({
          id: events.id,
          installId: events.installId,
          computerName: installs.computerName,
          gitUserId: installs.gitUserId,
          command: events.command,
          subcommand: events.subcommand,
          startedAt: events.startedAt,
          endedAt: events.endedAt,
          durationMs: events.durationMs,
          outcome: events.outcome,
          featureName: events.featureName,
          roundCount: events.roundCount,
          sessionId: events.sessionId,
          createdAt: events.createdAt,
        })
        .from(events)
        .innerJoin(installs, eq(events.installId, installs.id))
        .where(whereClause)
        .orderBy(desc(events.startedAt))
        .limit(limit)
        .offset(offset),

      // Count query — same WHERE, no LIMIT/OFFSET.
      db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .innerJoin(installs, eq(events.installId, installs.id))
        .where(whereClause),
    ]);

    const total = countRows[0]?.count ?? 0;

    // 8. Shape event objects — convert Date objects to ISO 8601 strings.
    const shapedEvents = dataRows.map((row) => ({
      id: row.id,
      installId: row.installId,
      computerName: row.computerName,
      gitUserId: row.gitUserId,
      command: row.command,
      subcommand: row.subcommand ?? null,
      startedAt: row.startedAt instanceof Date
        ? row.startedAt.toISOString()
        : new Date((row.startedAt as number) * 1000).toISOString(),
      endedAt: row.endedAt instanceof Date
        ? row.endedAt.toISOString()
        : row.endedAt !== null && row.endedAt !== undefined
          ? new Date((row.endedAt as number) * 1000).toISOString()
          : null,
      durationMs: row.durationMs ?? null,
      outcome: row.outcome ?? null,
      featureName: row.featureName ?? null,
      roundCount: row.roundCount ?? null,
      sessionId: row.sessionId ?? null,
      createdAt: row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date((row.createdAt as number) * 1000).toISOString(),
    }));

    // 9. Compute hasMore — boundary formula (FR-9, EC-12, EC-13).
    // hasMore = total > offset + events.length (exact count returned this page)
    const hasMore = total > offset + shapedEvents.length;

    return NextResponse.json(
      {
        events: shapedEvents,
        pagination: { page, limit, total, hasMore },
      },
      { status: 200, headers: NO_STORE }
    );
  } catch {
    // Do not expose raw D1 errors (NFR-6).
    return errorResponse(500, "Internal server error");
  }
}
