/**
 * CLI auth middleware helper.
 *
 * Extracts the `Authorization: Bearer <apiKey>` header, looks up the API key
 * in `installs.apiKey` (stored as plaintext), and returns `{ installId, orgId }`.
 *
 * Performs a best-effort `lastSeenAt` update as a fire-and-forget side-effect.
 *
 * Returns a 401 NextResponse if:
 *   - the Authorization header is absent or not in Bearer format
 *   - no install row matches the provided API key
 *
 * Returns a 500 NextResponse if `API_KEY_SALT` is missing or shorter than 16 chars
 * (misconfiguration guard — this env var is required for install HMAC verification
 * in the installs route, so its absence here signals a misconfigured environment).
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDatabase } from "@/lib/db";
import { installs } from "@/db/schema";

export type ApiKeyContext = {
  installId: string;
  orgId: string;
};

type ApiKeyResult =
  | { ok: true; context: ApiKeyContext }
  | { ok: false; response: NextResponse };

const MIN_SALT_LENGTH = 16;

/**
 * Validates the Bearer API key from the request and returns the install context.
 *
 * `API_KEY_SALT` is checked at request time (not module load) per NFR-2 and
 * the Cloudflare constraint that env bindings are unavailable at module init.
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
  // Check API_KEY_SALT at request time.
  const { env } = getCloudflareContext();
  const salt = env.API_KEY_SALT ?? "";
  if (salt.length < MIN_SALT_LENGTH) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "server misconfiguration" },
        { status: 500 }
      ),
    };
  }

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

  // Look up install by apiKey.
  const installRow = await db
    .select({ id: installs.id, orgId: installs.orgId })
    .from(installs)
    .where(eq(installs.apiKey, bearerToken))
    .get();

  if (!installRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  // Best-effort lastSeenAt update — fire-and-forget, must not fail the request.
  try {
    await db
      .update(installs)
      .set({ lastSeenAt: new Date() })
      .where(eq(installs.id, installRow.id));
  } catch {
    // Intentionally swallowed — lastSeenAt is telemetry, not correctness-critical.
  }

  return {
    ok: true,
    context: {
      installId: installRow.id,
      orgId: installRow.orgId,
    },
  };
}
