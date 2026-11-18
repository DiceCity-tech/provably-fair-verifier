// @ts-check
// HiLo: an endless deck. Card j is floor(n_j * 52 / 2^32), rank
// floor(card / 4) + 1 (Ace = 1 .. King = 13), suit card mod 4. Card 0 is the
// start card; 52 cards are fixed per bet. After right guesses with w_1..w_k
// winning ranks (out of 13) the multiplier is 0.99 x 13^k / (w_1 x .. x w_k),
// trimmed and rounded down.

import { ints, scale, trimmed } from "../stream.js";
import { need } from "../params.js";

export const id = "hilo";
export const name = "HiLo";
export const rulesVersion = "h1";
export const stepped = true;

/** @param {any} p */
export function parseParams(p) {
  need(p == null || Object.keys(p).length === 0, "HiLo takes no options");
  return {};
}

/** @param {number[]} counts winning ranks of each right guess */
export function stepMultiplier(counts) {
  need(counts.length > 0 && counts.every((w) => Number.isInteger(w) && w >= 1 && w <= 12), "counts must be 1 to 12 each");
  return trimmed(13n ** BigInt(counts.length), counts.reduce((a, w) => a * BigInt(w), 1n));
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  parseParams(params);
  const deck = (await ints(s, c, nonce, 52)).map((n) => scale(n, 52));
  return { outcome: { deck, turned: 1, steps: [], counts: [] }, multiplier: 0 };
}
