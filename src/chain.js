// @ts-check
// Crash and Slide: one result per round for everyone, from a hash chain.
//
// The chain is made backwards from a hidden random last hash: hash(k - 1) =
// SHA-256(hash k), hashing the hex text itself. Hash 0 is the commitment,
// published before round 1. Round k uses hash k, so each revealed hash can
// be hashed back to the one before it, and k times back to the commitment.
//
// Result: n = the first 52 bits of HMAC-SHA256(key = round hash, message =
// salt); result = max(100, floor(99 x 2^52 / (2^52 - n))) in hundredths
// (1.00x and up). Crash crashes at the result; a Slide target wins when it is
// at or below the result.

import { hmacSha256, sha256Hex } from "./crypto.js";

const TWO_52 = 2n ** 52n;

/**
 * A round's result in hundredths.
 * @param {string} hash the round hash, as shown (hex text)
 * @param {string} salt the chain's salt
 * @returns {Promise<number>}
 */
export async function roundResult(hash, salt) {
  const mac = await hmacSha256(hash, salt);
  let first56 = 0n;
  for (let i = 0; i < 7; i++) first56 = (first56 << 8n) | BigInt(mac[i]);
  const n = first56 >> 4n;
  const point = (99n * TWO_52) / (TWO_52 - n);
  return Number(point < 100n ? 100n : point);
}

/**
 * The hash before a round's hash: SHA-256 of its hex text.
 * @param {string} hash
 * @returns {Promise<string>}
 */
export function previousHash(hash) {
  return sha256Hex(hash.trim().toLowerCase());
}

/**
 * Hash a round's hash back `steps` times. With steps = the round number,
 * the answer must be the chain's commitment.
 * @param {string} hash
 * @param {number} steps
 * @param {(done: number) => void} [progress] called every 100,000 steps
 * @returns {Promise<string>}
 */
export async function walkBack(hash, steps, progress) {
  let h = hash.trim().toLowerCase();
  for (let i = 1; i <= steps; i++) {
    h = await sha256Hex(h);
    if (progress && i % 100000 === 0) progress(i);
  }
  return h;
}
