// @ts-check
// Skyscraper: 9 rows. Each row has `tiles` tiles of which `eggs` are safe:
// easy 4/3, medium 3/2, hard 2/1, expert 3/1, master 4/1. Row r (0-based,
// bottom first) uses the numbers r*eggs .. r*eggs + eggs - 1 of the stream,
// drawn without replacement from 0..tiles-1. After k rows the multiplier is
// 0.99 x (tiles / eggs)^k, trimmed and rounded down.

import { drawWithoutReplacement, ints, range, trimmed } from "../stream.js";
import { int, oneOf } from "../params.js";

export const id = "tower";
export const name = "Skyscraper";
export const rulesVersion = "t1";
export const stepped = true;
export const ROWS = 9;

/** @type {Record<string, [number, number]>} difficulty: [tiles, eggs] */
export const LEVELS = { easy: [4, 3], medium: [3, 2], hard: [2, 1], expert: [3, 1], master: [4, 1] };

/** @param {any} p */
export function parseParams(p) {
  return { difficulty: oneOf(p?.difficulty, Object.keys(LEVELS), "difficulty") };
}

/** @param {string} difficulty @param {number} rows */
export function stepMultiplier(difficulty, rows) {
  const [tiles, eggs] = LEVELS[difficulty];
  int(rows, 0, ROWS, "rows");
  return rows === 0 ? 0 : trimmed(BigInt(tiles) ** BigInt(rows), BigInt(eggs) ** BigInt(rows));
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { difficulty } = parseParams(params);
  const [tiles, eggs] = LEVELS[difficulty];
  const all = await ints(s, c, nonce, ROWS * eggs);
  const rows = range(ROWS).map((r) =>
    drawWithoutReplacement(all.slice(r * eggs, r * eggs + eggs), range(tiles)).sort((a, b) => a - b),
  );
  return { outcome: { eggs: rows, picks: [] }, multiplier: 0 };
}
