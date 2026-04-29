/**
 * PATCH /api/v1/installs/[id]/revoke — Revoke an install by ID.
 *
 * Auth: CTO session cookie (__Host-session) via requireCtoSession().
 * orgId is always sourced from the session — the install must belong to the
 * session's org (FR-8, BR-6): wrong org or not found both return 404 to prevent
 * enumeration.
 *
 * Idempotent: revoking an already-revoked install returns 200 without error (FR-9, AC-8).
 *
 * Note: params must be awaited — Next.js 16 requirement (project profile section 10).
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { getDatabase } from "@/lib/db";
import { installs } from "@/db/schema";

export async function PATCH(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // 1. Authenticate — CTO session required.
  const sessionResult = await requireCtoSession();
  if (!sessionResult.ok) {
    return sessionResult.response;
  }

  const { orgId } = sessionResult.session;

  // 2. Await params — required in Next.js 16 (project profile section 10).
  const { id } = await ctx.params;

  const db = getDatabase();

  // 3. Look up the install, scoped to session orgId (FR-8, BR-6).
  //    Returns 404 for both "not found" and "belongs to another org" (BR-6: prevent enumeration).
  const installRow = await db
    .select({ id: installs.id, revokedAt: installs.revokedAt })
    .from(installs)
    .where(and(eq(installs.id, id), eq(installs.orgId, orgId)))
    .get();

  if (!installRow) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // 4. Idempotent: already revoked → 200 without re-updating (FR-9, AC-8).
  if (installRow.revokedAt !== null) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // 5. Set revokedAt to current time (AC-7).
  try {
    await db
      .update(installs)
      .set({ revokedAt: new Date() })
      .where(eq(installs.id, installRow.id));
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
