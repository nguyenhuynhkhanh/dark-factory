/**
 * Session middleware helper for CTO dashboard routes.
 *
 * Reads the `__Host-session` cookie, validates it against the D1 sessions table
 * (expiresAt must be in the future), and returns `{ userId, orgId }`.
 *
 * Returns a 401 NextResponse if:
 *   - the cookie is absent
 *   - the session row does not exist or is expired
 *
 * Returns a 500 NextResponse (corrupt: true) if:
 *   - the session row exists but the associated user row is gone (orphaned session)
 *   - this signals a data integrity issue, not an auth failure (FR-14)
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

/**
 * SessionResult discriminated union:
 * - ok: true  → session resolved successfully; use result.session
 * - ok: false → auth or data error; return result.response to the client
 *   - corrupt: true  → data integrity issue (orphaned user); route should return 500
 *   - corrupt: false → normal auth failure (missing/expired session); route/layout returns 401
 */
type SessionResult =
  | { ok: true; session: CtoSession }
  | { ok: false; corrupt: boolean; response: NextResponse };

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
      corrupt: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
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
      corrupt: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  // Guard against orphaned sessions (D1 does not enforce FK constraints).
  const userRow = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, sessionRow.userId))
    .get();

  if (!userRow) {
    // Session row exists but the referenced user is gone — data integrity issue (FR-14).
    // Return corrupt: true so route handlers can distinguish this from a normal auth failure.
    return {
      ok: false,
      corrupt: true,
      response: NextResponse.json({ error: "Session data corrupt." }, { status: 500 }),
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
