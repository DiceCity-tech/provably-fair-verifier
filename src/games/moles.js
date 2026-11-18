// @ts-check
// Manholes: 7 holes (0..6). With k moles (1..6) the game lasts 8 rounds
// (k = 1) or 9 rounds (k = 2..6). Round r uses the numbers r*k .. r*k + k - 1
// of the stream, drawn without replacement from 0..6. After n hits the
// multiplier is 0.99 x (7 / k)^n, trimmed and rounded down.

import { drawWithoutReplacement, ints, range, trimmed } from "../stream.js";
import { int } from "../params.js";

export const id = "moles";
export const name = "Manholes";
export const rulesVersion = "o1";
export const stepped = true;

/** @param {number} k */
export const maxRounds = (k) => (k === 1 ? 8 : 9);

/** @param {any} p */
export function parseParams(p) {
  return { moles: int(p?.moles, 1, 6, "moles") };
}

/** @param {number} k @param {number} hits */
export function stepMultiplier(k, hits) {
  int(hits, 0, maxRounds(k), "hits");
  return hits === 0 ? 0 : trimmed(7n ** BigInt(hits), BigInt(k) ** BigInt(hits));
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { moles: k } = parseParams(params);
  const all = await ints(s, c, nonce, maxRounds(k) * k);
  const rounds = range(maxRounds(k)).map((r) => drawWithoutReplacement(all.slice(r * k, r * k + k), range(7)).sort((a, b) => a - b));
  return { outcome: { moles: rounds, picks: [] }, multiplier: 0 };
}
