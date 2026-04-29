/**
 * GET /api/v1/auth/me
 *
 * Returns the current CTO's identity from a valid session cookie.
 * Uses requireCtoSession to validate the session.
 * Response: { id, email, role, orgId }
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { getDatabase } from "@/lib/db";
import { users } from "@/db/schema";

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const result = await requireCtoSession();
  if (!result.ok) {
    return result.response;
  }

  const { userId } = result.session;
  const db = getDatabase();

  let userRow:
    | { id: string; email: string; role: string; orgId: string }
    | undefined;
  try {
    userRow = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        orgId: users.orgId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[me] user lookup error:", message);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }

  if (!userRow) {
    // Session exists but user row is gone — treat as unauthorized.
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    id: userRow.id,
    email: userRow.email,
    role: userRow.role,
    orgId: userRow.orgId,
  });
}
