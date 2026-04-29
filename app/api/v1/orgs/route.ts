/**
 * PATCH /api/v1/orgs — Update the org name for the authenticated CTO's org.
 *
 * Auth: CTO session cookie (__Host-session) via requireCtoSession().
 * orgId is always sourced from the authenticated session — never from the request body (FR-12, BR-1, EC-6).
 *
 * Body: { name: string }
 *
 * Returns { id, name } on success (AC-13).
 *
 * Validation:
 * - name must be present and non-empty
 * - name must not exceed 100 chars
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { getDatabase } from "@/lib/db";
import { orgs } from "@/db/schema";

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  // 1. Authenticate — CTO session required (FR-12).
  const sessionResult = await requireCtoSession();
  if (!sessionResult.ok) {
    return sessionResult.response;
  }

  const { orgId } = sessionResult.session;

  // 2. Parse and validate request body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  // EC-6: orgId in body is silently ignored — session orgId is always used.
  const { name } = body as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  if (name.length > 100) {
    return NextResponse.json({ error: "name too long" }, { status: 400 });
  }

  const db = getDatabase();

  // 3. Update org name scoped to session orgId (FR-12, BR-1).
  try {
    await db
      .update(orgs)
      .set({ name })
      .where(eq(orgs.id, orgId));
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }

  return NextResponse.json({ id: orgId, name }, { status: 200 });
}
