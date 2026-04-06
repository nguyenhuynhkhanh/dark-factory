/**
 * Session middleware helper for CTO dashboard routes.
 *
 * Reads the `__Host-session` cookie, validates it against the D1 sessions table
 * (expiresAt must be in the future), and returns `{ userId, orgId }`.
 *
 * Returns a 401 NextResponse if:
 *   - the cookie is absent
 *   - the session row does not exist or is expired
 *   - the session row exists but the associated user row is gone (orphaned session)
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { sessions, users } from "@/db/schema";

export type CtoSession = {
  userId: string;
  orgId: string;
};

type SessionResult =
  | { ok: true; session: CtoSession }
  | { ok: false; response: NextResponse };

const COOKIE_NAME = "__Host-session";

/**
 * Validates the CTO session cookie and returns the session context.
 *
 * Usage in a Route Handler:
 * ```ts
 * const result = await requireCtoSession();
 * if (!result.ok) return result.response;
 * const { userId, orgId } = result.session;
 * ```
 */
export async function requireCtoSession(): Promise<SessionResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  const db = getDatabase();
  const now = new Date();

  // Look up session row — must exist and not be expired.
  const sessionRow = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, now)))
    .get();

  if (!sessionRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  // Guard against orphaned sessions (D1 does not enforce FK constraints).
  const userRow = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, sessionRow.userId))
    .get();

  if (!userRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  return {
    ok: true,
    session: {
      userId: sessionRow.userId,
      orgId: userRow.orgId,
    },
  };
}
