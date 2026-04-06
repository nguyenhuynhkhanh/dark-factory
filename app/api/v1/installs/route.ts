/**
 * POST /api/v1/installs — CLI install registration.
 *
 * Unauthenticated endpoint (HMAC-protected). The CLI calls this during
 * `df-onboard` to register a machine and receive a static API key.
 *
 * Security check order (CRITICAL — do not reorder):
 *   1. Validate API_KEY_SALT is configured (≥ 16 chars) → 500 if misconfigured
 *   2. Validate all body fields present and correct types → 400 if invalid
 *   3. Verify HMAC before any D1 query → 403 if mismatch
 *   4. Verify orgId exists in D1 → 404 if not found
 *   5. INSERT installs row → 409 if userId already registered
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDatabase } from "@/lib/db";
import { installs, orgs } from "@/db/schema";

const MIN_SALT_LENGTH = 16;
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type InstallRequestBody = {
  id: unknown;
  orgId: unknown;
  computerName: unknown;
  gitUserId: unknown;
  hmac: unknown;
};

/**
 * Decodes a hex string to a Uint8Array.
 * Returns null if the string is not valid hex.
 */
function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(byte)) return null;
    bytes[i / 2] = byte;
  }
  return bytes;
}

/**
 * Encodes a Uint8Array to a lowercase hex string.
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Step 1: Validate API_KEY_SALT ────────────────────────────────────────
  let salt: string;
  try {
    const { env } = getCloudflareContext();
    salt = env.API_KEY_SALT ?? "";
  } catch {
    return NextResponse.json(
      { error: "server misconfiguration" },
      { status: 500 }
    );
  }

  if (salt.length < MIN_SALT_LENGTH) {
    return NextResponse.json(
      { error: "server misconfiguration" },
      { status: 500 }
    );
  }

  // ── Step 2: Parse and validate body fields ────────────────────────────────
  let body: InstallRequestBody;
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "missing required fields" },
      { status: 400 }
    );
  }

  const { id, orgId, computerName, gitUserId, hmac } = body;

  // All fields must be present and non-empty strings
  if (
    typeof id !== "string" ||
    typeof orgId !== "string" ||
    typeof computerName !== "string" ||
    typeof gitUserId !== "string" ||
    typeof hmac !== "string" ||
    id.trim() === "" ||
    orgId.trim() === "" ||
    computerName.trim() === "" ||
    gitUserId.trim() === "" ||
    hmac.trim() === ""
  ) {
    return NextResponse.json(
      { error: "missing required fields" },
      { status: 400 }
    );
  }

  // userId (id field) must be UUID v4 format and ≤ 64 chars
  if (!UUID_V4_REGEX.test(id) || id.length > 64) {
    return NextResponse.json(
      { error: "invalid userId format" },
      { status: 400 }
    );
  }

  // Length limits
  if (computerName.length > 255) {
    return NextResponse.json(
      { error: "computerName too long" },
      { status: 400 }
    );
  }

  if (gitUserId.length > 255) {
    return NextResponse.json(
      { error: "gitUserId too long" },
      { status: 400 }
    );
  }

  // ── Step 3: Verify HMAC (before any D1 query) ────────────────────────────
  // Message = `${userId}${computerName}${gitUserId}` (no separator — must match CLI)
  const encoder = new TextEncoder();
  const message = `${id}${computerName}${gitUserId}`;

  let hmacKey: CryptoKey;
  try {
    hmacKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(salt),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  } catch {
    return NextResponse.json(
      { error: "server misconfiguration" },
      { status: 500 }
    );
  }

  // Decode the provided HMAC from hex
  const providedHmacBytes = hexToBytes(hmac);
  if (providedHmacBytes === null) {
    return NextResponse.json({ error: "invalid hmac" }, { status: 403 });
  }

  // Use crypto.subtle.verify for constant-time comparison (natively constant-time for HMAC).
  // Copy bytes into a fresh ArrayBuffer to satisfy the BufferSource type constraint
  // (Uint8Array.buffer may be a SharedArrayBuffer in some environments).
  const providedHmacBuffer = new Uint8Array(providedHmacBytes).buffer as ArrayBuffer;

  let hmacValid: boolean;
  try {
    hmacValid = await crypto.subtle.verify(
      { name: "HMAC" },
      hmacKey,
      providedHmacBuffer,
      encoder.encode(message)
    );
  } catch {
    hmacValid = false;
  }

  if (!hmacValid) {
    return NextResponse.json({ error: "invalid hmac" }, { status: 403 });
  }

  // ── Step 4: Verify org exists ─────────────────────────────────────────────
  let db: ReturnType<typeof getDatabase>;
  try {
    db = getDatabase();
  } catch {
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }

  let orgRow: { id: string } | undefined;
  try {
    orgRow = await db
      .select({ id: orgs.id })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .get();
  } catch {
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }

  if (!orgRow) {
    return NextResponse.json({ error: "org not found" }, { status: 404 });
  }

  // ── Step 5: Generate API key and INSERT installs row ─────────────────────
  // API key: 32 random bytes hex-encoded = 64 hex characters
  const apiKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(apiKeyBytes);
  const apiKey = bytesToHex(apiKeyBytes);

  try {
    await db.insert(installs).values({
      id, // installs.id = userId (CLI-provided UUID)
      orgId,
      computerName,
      gitUserId,
      hmac, // store raw HMAC value from body
      apiKey,
      createdAt: new Date(),
      lastSeenAt: null,
    });
  } catch (err: unknown) {
    // Map D1 UNIQUE constraint violation (duplicate userId) to 409
    if (
      err instanceof Error &&
      (err.message.includes("UNIQUE constraint failed") ||
        err.message.includes("SQLITE_CONSTRAINT"))
    ) {
      return NextResponse.json(
        { error: "already registered" },
        { status: 409 }
      );
    }
    // All other D1 errors → generic 500 (do not leak internal details)
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ apiKey }, { status: 201 });
}
