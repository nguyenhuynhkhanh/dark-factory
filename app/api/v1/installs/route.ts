/**
 * POST /api/v1/installs — Admin generates a new labeled API key.
 *
 * Auth: CTO session cookie (__Host-session) via requireCtoSession().
 * orgId is always sourced from the session — never from the request body (BR-1).
 *
 * Creates one install row with:
 * - server-generated UUID `id`
 * - server-generated `apiKey` (32 random bytes, hex-encoded)
 * - `expiresAt = now + 30d` (set at creation time, not first use — FR-5)
 * - `revokedAt = null`
 * - `computerName = null`, `gitUserId = null` (populated later by activate)
 *
 * Returns 201 { id, apiKey, label, expiresAt } on success.
 * `apiKey` is shown exactly once — it is never returned by any other endpoint (BR-3, NFR-2).
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { requireCtoSession } from "@/lib/auth/requireCtoSession";
import { getDatabase } from "@/lib/db";
import { installs } from "@/db/schema";

/** Convert a Uint8Array to a lowercase hex string. */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Authenticate — CTO session required (FR-4).
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

  const { label: rawLabel } = body as Record<string, unknown>;

  if (typeof rawLabel !== "string") {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const label = rawLabel.trim();

  if (!label) {
    // EC-8: whitespace-only label is treated as empty.
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  if (label.length > 64) {
    return NextResponse.json({ error: "label too long" }, { status: 400 });
  }

  const db = getDatabase();

  // 3. Enforce label uniqueness within org (non-revoked installs only) — FR-6, BR-2, EC-3.
  //    Pre-insert SELECT check (race window is acceptable per spec EC-5).
  const existingRow = await db
    .select({ id: installs.id })
    .from(installs)
    .where(
      and(
        eq(installs.orgId, orgId),
        eq(installs.label, label),
        isNull(installs.revokedAt)
      )
    )
    .get();

  if (existingRow) {
    return NextResponse.json({ error: "label already in use" }, { status: 409 });
  }

  // 4. Generate server-side id and apiKey (FR-5).
  const id = crypto.randomUUID();
  const apiKeyBytes = crypto.getRandomValues(new Uint8Array(32));
  const apiKey = bytesToHex(apiKeyBytes); // 64-char hex string

  // 5. Set expiresAt at creation time: now + 30d in Unix seconds (NFR-1, FR-5).
  const expiresAtUnix = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const expiresAt = new Date(expiresAtUnix * 1000);
  const createdAt = new Date();

  try {
    await db.insert(installs).values({
      id,
      orgId,
      label,
      computerName: null,
      gitUserId: null,
      apiKey,
      expiresAt,
      revokedAt: null,
      createdAt,
      lastSeenAt: null,
    });
  } catch (err) {
    // Catch potential D1 UNIQUE constraint violation on apiKey (extremely unlikely but safe).
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("unique")) {
      return NextResponse.json({ error: "label already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }

  // 6. Return 201 with apiKey — only time it is ever sent to the client (FR-7, BR-3).
  // expiresAt as Unix seconds integer (NFR-1).
  return NextResponse.json(
    { id, apiKey, label, expiresAt: expiresAtUnix },
    { status: 201 }
  );
}
