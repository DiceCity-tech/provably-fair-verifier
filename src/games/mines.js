// @ts-check
// Mines: a 5x5 grid, tiles 0..24. The first `mines` tiles drawn without
// replacement from 0..24 are the mines (step i takes position
// floor(n_i * (25 - i) / 2^32) of the tiles left). After k gems the
// multiplier is 0.99 x C(25, k) / C(25 - mines, k), trimmed by one part in
// ten million and rounded down.

import { binomial, drawWithoutReplacement, ints, range, trimmed } from "../stream.js";
import { int } from "../params.js";

export const id = "mines";
export const name = "Mines";
export const rulesVersion = "m1";
export const stepped = true;

/** @param {any} p */
export function parseParams(p) {
  return { mines: int(p?.mines, 1, 24, "mines") };
}

/**
 * The mine tiles, sorted.
 * @param {string} s @param {string} c @param {number|bigint} nonce @param {number} count
 */
export async function mineTiles(s, c, nonce, count) {
  return drawWithoutReplacement(await ints(s, c, nonce, count), range(25)).sort((a, b) => a - b);
}

/**
 * Multiplier in ten-thousandths after `gems` safe tiles.
 * @param {number} mines @param {number} gems
 */
export function stepMultiplier(mines, gems) {
  return trimmed(binomial(25, gems), binomial(25 - mines, gems));
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { mines } = parseParams(params);
  return { outcome: { mines: await mineTiles(s, c, nonce, mines), revealed: [] }, multiplier: 0 };
}
