/**
 * POST /api/v1/auth/login
 *
 * Validates email + password, creates a session, sets the __Host-session cookie.
 * Fire-and-forgets cleanup of expired sessions for the user.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, lt } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { users, sessions } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";

const COOKIE_NAME = "__Host-session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function generateId(): string {
  return globalThis.crypto.randomUUID();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    !("password" in body)
  ) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  if (!email.trim() || !password) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  if (password.length > 1000) {
    return NextResponse.json({ error: "password too long" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const db = getDatabase();

  let userRow: { id: string; passwordHash: string } | undefined;
  try {
    userRow = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .get();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[login] user lookup error:", message);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }

  if (!userRow) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const passwordValid = await verifyPassword(password, userRow.passwordHash);
  if (!passwordValid) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const now = new Date();
  const sessionId = generateId();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  try {
    await db.insert(sessions).values({
      id: sessionId,
      userId: userRow.id,
      expiresAt,
      createdAt: now,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[login] session insert error:", message);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }

  // Fire-and-forget: delete expired sessions for this user.
  // Must not fail the login if the cleanup errors.
  void db
    .delete(sessions)
    .where(
      and(eq(sessions.userId, userRow.id), lt(sessions.expiresAt, now))
    )
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[login] expired session cleanup error:", message);
    });

  const response = NextResponse.json({ ok: true }, { status: 200 });

  response.cookies.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
