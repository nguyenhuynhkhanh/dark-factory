/**
 * POST /api/v1/installs/activate — Activate an install (set machine info).
 *
 * Auth: Bearer API key via requireApiKey().
 * The install is resolved from the token — no `id` in the path or body (FR-10).
 *
 * Idempotent: always overwrites computerName and gitUserId unconditionally (FR-11, BR-7, AC-11).
 * Also sets expiresAt = now + 30d and lastSeenAt = now in the same UPDATE.
 *
 * Body: { computerName: string, gitUserId: string }
 *
 * Field length limits:
 * - computerName: max 255 chars
 * - gitUserId: max 255 chars
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireApiKey } from "@/lib/auth/requireApiKey";
import { getDatabase } from "@/lib/db";
import { installs } from "@/db/schema";

const MAX_FIELD_LENGTH = 255;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Authenticate — Bearer API key required (FR-10).
  //    requireApiKey also checks revocation and expiry, so a revoked key returns 403 here (AC-12).
  const authResult = await requireApiKey(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { installId } = authResult.context;

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

  const { computerName, gitUserId } = body as Record<string, unknown>;

  if (typeof computerName !== "string" || typeof gitUserId !== "string") {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  if (!computerName || !gitUserId) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  if (computerName.length > MAX_FIELD_LENGTH) {
    return NextResponse.json({ error: "computerName too long" }, { status: 400 });
  }

  if (gitUserId.length > MAX_FIELD_LENGTH) {
    return NextResponse.json({ error: "gitUserId too long" }, { status: 400 });
  }

  // 3. Update computerName, gitUserId, expiresAt, and lastSeenAt in one UPDATE (FR-11, AC-10).
  //    Idempotent — always overwrites (BR-7).
  const db = getDatabase();
  const now = new Date();
  const expiresAt = new Date(Math.floor(Date.now() / 1000) * 1000 + 30 * 24 * 60 * 60 * 1000);

  try {
    await db
      .update(installs)
      .set({ computerName, gitUserId, expiresAt, lastSeenAt: now })
      .where(eq(installs.id, installId));
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
