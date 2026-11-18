// @ts-check
// Flip: 20 coins, coin j heads when floor(n_j * 2 / 2^32) = 0, tails
// otherwise. After k right calls the multiplier is 0.99 x 2^k, trimmed and
// rounded down.

import { ints, scale, trimmed } from "../stream.js";
import { int, need } from "../params.js";

export const id = "flip";
export const name = "Flip";
export const rulesVersion = "f1";
export const stepped = true;

/** @param {any} p */
export function parseParams(p) {
  need(p == null || Object.keys(p).length === 0, "Flip takes no options");
  return {};
}

/** @param {number} wins */
export function stepMultiplier(wins) {
  int(wins, 0, 20, "wins");
  return wins === 0 ? 0 : trimmed(2n ** BigInt(wins), 1n);
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  parseParams(params);
  const coins = (await ints(s, c, nonce, 20)).map((n) => (scale(n, 2) === 0 ? "heads" : "tails"));
  return { outcome: { coins, calls: [] }, multiplier: 0 };
}
