/**
 * POST /api/v1/auth/logout
 *
 * Deletes the session row from D1 and clears the __Host-session cookie.
 * Always returns 200 — idempotent (also 200 if no cookie is present).
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { sessions } from "@/db/schema";

const COOKIE_NAME = "__Host-session";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (token) {
    const db = getDatabase();
    try {
      await db.delete(sessions).where(eq(sessions.id, token));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[logout] session delete error:", message);
      // Still clear the cookie and return 200 — do not surface internal errors.
    }
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });

  // Clear the cookie by setting max-age=0 with the same attributes.
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
