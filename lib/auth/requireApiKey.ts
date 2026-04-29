/**
 * CLI auth middleware helper.
 *
 * Extracts the `Authorization: Bearer <apiKey>` header, looks up the API key
 * in `installs.apiKey` (stored as plaintext), and returns `{ installId, orgId }`.
 *
 * Checks revocation (revokedAt IS NOT NULL → 403) and expiry (expiresAt < now → 401).
 *
 * Performs a fire-and-forget update of both `lastSeenAt` and `expiresAt` (sliding +30 days)
 * on every successful auth. Errors are swallowed.
 *
 * Returns a 401 NextResponse if:
 *   - the Authorization header is absent or not in Bearer format
 *   - no install row matches the provided API key
 *   - the install is expired
 *
 * Returns a 403 NextResponse if:
 *   - the install has been revoked (revokedAt IS NOT NULL)
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { installs } from "@/db/schema";

export type ApiKeyContext = {
  installId: string;
  orgId: string;
};

type ApiKeyResult =
  | { ok: true; context: ApiKeyContext }
  | { ok: false; response: NextResponse };

/**
 * Validates the Bearer API key from the request and returns the install context.
 *
 * Usage in a Route Handler:
 * ```ts
 * const result = await requireApiKey(request);
 * if (!result.ok) return result.response;
 * const { installId, orgId } = result.context;
 * ```
 */
export async function requireApiKey(
  request: NextRequest
): Promise<ApiKeyResult> {
  // Extract Bearer token.
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  const bearerToken = authHeader.slice("Bearer ".length).trim();
  if (!bearerToken) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  const db = getDatabase();

  // Look up install by apiKey — select revokedAt and expiresAt for auth checks.
  const installRow = await db
    .select({
      id: installs.id,
      orgId: installs.orgId,
      revokedAt: installs.revokedAt,
      expiresAt: installs.expiresAt,
    })
    .from(installs)
    .where(eq(installs.apiKey, bearerToken))
    .get();

  if (!installRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  // Check revocation first (FR-1, BR-5): revoked key → 403.
  if (installRow.revokedAt !== null) {
    return {
      ok: false,
      response: NextResponse.json({ error: "api key revoked" }, { status: 403 }),
    };
  }

  // Check expiry (FR-1, BR-5): expired key → 401.
  // expiresAt is stored as { mode: "timestamp" } — Drizzle returns a Date object.
  const now = new Date();
  if (installRow.expiresAt < now) {
    return {
      ok: false,
      response: NextResponse.json({ error: "api key expired" }, { status: 401 }),
    };
  }

  // Fire-and-forget: update lastSeenAt AND sliding expiresAt (FR-2, BR-4, AC-1, EC-7).
  // Errors are intentionally swallowed — this must not fail the request.
  const newExpiresAt = new Date(Math.floor(Date.now() / 1000) * 1000 + 30 * 24 * 60 * 60 * 1000);
  void db
    .update(installs)
    .set({ lastSeenAt: now, expiresAt: newExpiresAt })
    .where(eq(installs.id, installRow.id))
    .catch(() => {
      // Intentionally swallowed — telemetry update, not correctness-critical (EC-7).
    });

  return {
    ok: true,
    context: {
      installId: installRow.id,
      orgId: installRow.orgId,
    },
  };
}
