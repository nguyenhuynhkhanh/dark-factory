import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db/client";

// Augment the global CloudflareEnv interface to include the DB binding
// declared in wrangler.jsonc.
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    API_KEY_SALT?: string;
  }
}

/**
 * Returns a typed Drizzle DB instance bound to the Cloudflare D1 database.
 *
 * Must only be called inside a request handler — `getCloudflareContext()` throws
 * outside of a request context (Cloudflare Workers constraint).
 */
export function getDatabase(): ReturnType<typeof getDb> {
  const { env } = getCloudflareContext();
  return getDb(env.DB);
}
