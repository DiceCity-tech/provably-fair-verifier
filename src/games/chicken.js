// @ts-check
// Chicken: lane j is deadly when floor(n_j * 25 / 2^32) < risk. Risk out of
// 25 and lanes: easy 1/24, medium 3/22, hard 5/20, daredevil 10/15. After k
// safe lanes the multiplier is 0.99 x (25 / (25 - risk))^k, trimmed and
// rounded down.

import { ints, scale, trimmed } from "../stream.js";
import { int, oneOf } from "../params.js";

export const id = "chicken";
export const name = "Chicken";
export const rulesVersion = "c1";
export const stepped = true;

/** @type {Record<string, [number, number]>} difficulty: [risk, lanes] */
export const LEVELS = { easy: [1, 24], medium: [3, 22], hard: [5, 20], daredevil: [10, 15] };

/** @param {any} p */
export function parseParams(p) {
  return { difficulty: oneOf(p?.difficulty, Object.keys(LEVELS), "difficulty") };
}

/** @param {string} difficulty @param {number} lanes */
export function stepMultiplier(difficulty, lanes) {
  const [risk, max] = LEVELS[difficulty];
  int(lanes, 0, max, "lanes");
  return lanes === 0 ? 0 : trimmed(25n ** BigInt(lanes), BigInt(25 - risk) ** BigInt(lanes));
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { difficulty } = parseParams(params);
  const [risk, lanes] = LEVELS[difficulty];
  const deadly = (await ints(s, c, nonce, lanes)).map((n) => scale(n, 25) < risk);
  return { outcome: { lanes: deadly, crossed: 0 }, multiplier: 0 };
}
