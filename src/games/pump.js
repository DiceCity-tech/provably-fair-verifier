// @ts-check
// Balloon Pop: 25 pumps; the difficulty hides 1, 3, 5 or 10 pops, placed
// exactly like Mines' mines over positions 0..24. Pump k (1-based) is safe
// unless position k - 1 is a pop. Step multipliers are Mines' with the pop
// count as the mine count.

import { int, oneOf } from "../params.js";
import { mineTiles, stepMultiplier as minesStep } from "./mines.js";

export const id = "pump";
export const name = "Balloon Pop";
export const rulesVersion = "p1";
export const stepped = true;

/** @type {Record<string, number>} */
export const POPS = { easy: 1, medium: 3, hard: 5, expert: 10 };

/** @param {any} p */
export function parseParams(p) {
  return { difficulty: oneOf(p?.difficulty, Object.keys(POPS), "difficulty") };
}

/** @param {string} difficulty @param {number} pumps */
export function stepMultiplier(difficulty, pumps) {
  const pops = POPS[difficulty];
  int(pumps, 0, 25 - pops, "pumps");
  return pumps === 0 ? 0 : minesStep(pops, pumps);
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { difficulty } = parseParams(params);
  return { outcome: { pops: await mineTiles(s, c, nonce, POPS[difficulty]), pumps: 0 }, multiplier: 0 };
}
