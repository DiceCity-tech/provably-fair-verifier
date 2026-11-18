// @ts-check
// The seed-pair method shared by every seed-based game.
//
// For a bet with server seed S, client seed C and nonce N, round r of the
// stream is HMAC-SHA256(key = S, message = "C:N:r"), for r = 0, 1, 2 ...
// The rounds are joined and read 4 bytes at a time, each group a big-endian
// unsigned 32-bit number n. A game turns n into a value below k with
// floor(n * k / 2^32). That is exact here: it is done with BigInt.

import { hmacSha256, sha256Hex } from "./crypto.js";

const TWO_32 = 4294967296n;

/**
 * The commitment shown before a bet: SHA-256 of the server seed text, lower-case hex.
 * @param {string} serverSeed
 * @returns {Promise<string>}
 */
export function serverSeedHash(serverSeed) {
  return sha256Hex(serverSeed);
}

/**
 * Whether a server seed fits a commitment (hex compared without regard to case).
 * @param {string} serverSeed
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function hashMatches(serverSeed, hash) {
  return (await serverSeedHash(serverSeed)) === hash.trim().toLowerCase();
}

/**
 * The first `count` unsigned 32-bit numbers of a bet's stream.
 * @param {string} serverSeed
 * @param {string} clientSeed
 * @param {number | bigint} nonce
 * @param {number} count
 * @returns {Promise<number[]>}
 */
export async function ints(serverSeed, clientSeed, nonce, count) {
  const rounds = Math.ceil((count * 4) / 32);
  const out = [];
  for (let r = 0; r < rounds; r++) {
    const bytes = await hmacSha256(serverSeed, `${clientSeed}:${nonce}:${r}`);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < 8 && out.length < count; i++) out.push(view.getUint32(i * 4, false));
  }
  return out;
}

/**
 * floor(n * k / 2^32): a uint32 scaled to 0 .. k-1.
 * @param {number} n
 * @param {number} k
 * @returns {number}
 */
export function scale(n, k) {
  return Number((BigInt(n) * BigInt(k)) / TWO_32);
}

/**
 * Draw without replacement: step i takes position scale(n_i, left) of the
 * items still left, and removes it. Returns the items taken, in order.
 * @template T
 * @param {number[]} uints
 * @param {T[]} items
 * @returns {T[]}
 */
export function drawWithoutReplacement(uints, items) {
  const left = [...items];
  return uints.map((n) => left.splice(scale(n, left.length), 1)[0]);
}

/**
 * Walk a weight table: the index of the row a ticket falls into, rows taken
 * in table order, row i covering the next `weights[i]` tickets.
 * @param {number[]} weights
 * @param {number} ticket
 * @returns {number}
 */
export function ticketRow(weights, ticket) {
  let upto = 0;
  for (let i = 0; i < weights.length; i++) {
    upto += weights[i];
    if (ticket < upto) return i;
  }
  throw new RangeError(`ticket ${ticket} is past the end of the table`);
}

/**
 * The integers 0 .. n-1 (or from .. to, inclusive).
 * @param {number} from
 * @param {number} [to]
 * @returns {number[]}
 */
export function range(from, to) {
  if (to === undefined) [from, to] = [0, from - 1];
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/**
 * C(n, k), exact.
 * @param {number} n
 * @param {number} k
 * @returns {bigint}
 */
export function binomial(n, k) {
  if (k < 0 || k > n) return 0n;
  let acc = 1n;
  for (let i = 1; i <= k; i++) acc = (acc * BigInt(n - k + i)) / BigInt(i);
  return acc;
}

/**
 * The step multiplier of the stepped games, in ten-thousandths:
 * 0.99 x num / den, trimmed by one part in ten million and rounded down.
 * @param {bigint} num
 * @param {bigint} den
 * @returns {number}
 */
export function trimmed(num, den) {
  return toNumber((99n * 100n * 9999999n * num) / (10000000n * den));
}

/**
 * A BigInt as a Number, refusing anything a Number cannot hold exactly.
 * @param {bigint} big
 * @returns {number}
 */
export function toNumber(big) {
  const n = Number(big);
  if (!Number.isSafeInteger(n)) throw new RangeError(`${big} is too large to show exactly`);
  return n;
}
