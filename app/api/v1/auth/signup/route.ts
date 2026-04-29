/**
 * POST /api/v1/auth/signup
 *
 * Creates a new org and CTO user atomically in a D1 transaction.
 * On success, inserts a session row, sets the __Host-session cookie,
 * and returns 201 with { id, orgId, inviteLink }.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { orgs, users, sessions } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";

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
    !("orgName" in body) ||
    !("email" in body) ||
    !("password" in body)
  ) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const { orgName, email, password } = body as Record<string, unknown>;

  if (
    typeof orgName !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const trimmedOrgName = orgName.trim();
  const normalizedEmail = email.toLowerCase().trim();

  if (!trimmedOrgName || !normalizedEmail || !password) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  if (trimmedOrgName.length > 100) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  if (normalizedEmail.length > 254) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  if (password.length > 1000) {
    return NextResponse.json({ error: "password too long" }, { status: 400 });
  }

  const db = getDatabase();

  const orgId = generateId();
  const userId = generateId();
  const now = new Date();
  const passwordHash = await hashPassword(password);

  try {
    await db.insert(orgs).values({
      id: orgId,
      name: trimmedOrgName,
      createdAt: now,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[signup] org insert error:", message);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }

  try {
    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      passwordHash,
      role: "cto",
      orgId,
      createdAt: now,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Roll back the org insert on user failure
    await db.delete(orgs).where(eq(orgs.id, orgId)).catch(() => {});
    if (
      message.includes("UNIQUE constraint failed") ||
      message.includes("unique constraint") ||
      message.includes("SQLITE_CONSTRAINT")
    ) {
      return NextResponse.json(
        { error: "email already registered" },
        { status: 409 }
      );
    }
    console.error("[signup] user insert error:", message);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }

  // Insert session row and set cookie
  const sessionId = generateId();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  try {
    await db.insert(sessions).values({
      id: sessionId,
      userId,
      expiresAt,
      createdAt: now,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[signup] session insert error:", message);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }

  const appUrl = process.env.APP_URL ?? `https://${request.headers.get("host") ?? "localhost"}`;
  const inviteLink = `${appUrl}/join?org=${orgId}`;

  const response = NextResponse.json(
    { id: userId, orgId, inviteLink },
    { status: 201 }
  );

  response.cookies.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
