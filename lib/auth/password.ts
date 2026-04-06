/**
 * PBKDF2-SHA256 password hashing and constant-time verification using Web Crypto.
 *
 * Hash format: `<base64salt>:<base64key>`
 * - salt: 32 random bytes, fresh per hash
 * - key:  32-byte PBKDF2 output
 * - iterations: 10,000 (Cloudflare Workers free-tier CPU budget: ~10ms wall time)
 *
 * No Node.js crypto — uses globalThis.crypto.subtle (V8 isolate / Workers runtime).
 */

const ITERATIONS = 10_000;
const KEY_LENGTH_BYTES = 32;
const SALT_LENGTH_BYTES = 32;

/**
 * Derives a raw PBKDF2-SHA256 key from `password` and `salt`.
 * The `salt` parameter must be backed by a plain `ArrayBuffer` so it satisfies
 * the `BufferSource` constraint in the Web Crypto API typings.
 */
async function deriveKey(
  password: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workers-types / dom lib Uint8Array variance
  salt: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> {
  const enc = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH_BYTES * 8
  );
  return new Uint8Array(bits) as Uint8Array<ArrayBuffer>;
}

/**
 * Hashes a plaintext password.
 * Returns a string in the format `<base64salt>:<base64key>`.
 */
export async function hashPassword(password: string): Promise<string> {
  const rawSalt = globalThis.crypto.getRandomValues(
    new Uint8Array(SALT_LENGTH_BYTES)
  );
  // Copy into a plain ArrayBuffer-backed Uint8Array to satisfy the BufferSource
  // constraint imposed by workers-types (getRandomValues returns Uint8Array<ArrayBufferLike>).
  const salt = new Uint8Array(rawSalt) as Uint8Array<ArrayBuffer>;
  const key = await deriveKey(password, salt);
  const saltB64 = btoa(String.fromCharCode(...salt));
  const keyB64 = btoa(String.fromCharCode(...key));
  return `${saltB64}:${keyB64}`;
}

/**
 * Verifies a plaintext password against a stored hash.
 *
 * Uses a constant-time XOR loop (no early return) to prevent timing attacks.
 * Returns `true` if the password matches, `false` otherwise.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [saltB64, keyB64] = parts;

  let salt: Uint8Array<ArrayBuffer>;
  let storedKey: Uint8Array<ArrayBuffer>;
  try {
    salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
    storedKey = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
  } catch {
    return false;
  }

  const derivedKey = await deriveKey(password, salt);

  // Constant-time comparison: accumulate XOR differences, never return early.
  if (derivedKey.length !== storedKey.length) {
    // Still run through the full loop to maintain timing consistency.
    let diff = 1;
    for (let i = 0; i < derivedKey.length; i++) {
      diff |= (derivedKey[i] ?? 0) ^ (storedKey[i % storedKey.length] ?? 0);
    }
    return diff === 0;
  }

  let diff = 0;
  for (let i = 0; i < derivedKey.length; i++) {
    diff |= (derivedKey[i] ?? 0) ^ (storedKey[i] ?? 0);
  }
  return diff === 0;
}
