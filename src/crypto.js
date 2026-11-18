// @ts-check
// Thin wrappers over the platform's Web Crypto (crypto.subtle). The same
// code runs in Node 20+ and in every current browser, with no dependencies.

const encoder = new TextEncoder();

/** @returns {SubtleCrypto} */
function subtle() {
  const c = globalThis.crypto;
  if (!c || !c.subtle) throw new Error("Web Crypto (crypto.subtle) is not available here. Use Node 20+ or a current browser.");
  return c.subtle;
}

/**
 * Text as UTF-8 bytes.
 * @param {string} text
 * @returns {Uint8Array}
 */
export function utf8(text) {
  return encoder.encode(text);
}

/**
 * Bytes as lower-case hex.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function toHex(bytes) {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/**
 * SHA-256 of some bytes.
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array>}
 */
export async function sha256(bytes) {
  return new Uint8Array(await subtle().digest("SHA-256", bytes));
}

/**
 * SHA-256 of a text, as lower-case hex. The text itself is hashed (its UTF-8
 * bytes), never the bytes a hex text stands for.
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function sha256Hex(text) {
  return toHex(await sha256(utf8(text)));
}

/**
 * HMAC-SHA256 with a text key over a text message.
 * @param {string} key
 * @param {string} message
 * @returns {Promise<Uint8Array>}
 */
export async function hmacSha256(key, message) {
  const k = await subtle().importKey("raw", utf8(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await subtle().sign("HMAC", k, utf8(message)));
}

/**
 * One AES-256-CTR block: the first 16 bytes of keystream for a 32-byte key
 * and a 16-byte initial counter block (encrypting 16 zero bytes).
 * @param {Uint8Array} key
 * @param {Uint8Array} counter
 * @returns {Promise<Uint8Array>}
 */
export async function aes256CtrBlock(key, counter) {
  const k = await subtle().importKey("raw", key, { name: "AES-CTR" }, false, ["encrypt"]);
  return new Uint8Array(await subtle().encrypt({ name: "AES-CTR", counter, length: 128 }, k, new Uint8Array(16)));
}
