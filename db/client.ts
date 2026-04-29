import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Usage: import { getDb } from "@/db/client"
// Pass the D1 binding from the Cloudflare env
export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
