// @ts-check
// Alley Run: a loop of 12 tiles, tile 0 the start; a tile weight of 0 is a
// snake. Up to 10 rolls of two dice, fixed when the bet is placed: die j is
// floor(n_j * 6 / 2^32) + 1, two per roll. A roll moves d1 + d2 tiles round
// the loop; a snake loses. After moves (p_1 -> t_1) .. (p_k -> t_k) the
// multiplier is 0.99 x prod(36 x w(t_i)) / prod(S(p_i)), trimmed and rounded
// down, where S(p) is the summed weight the 36 dice pairs land on from p.
// The 10th roll cashes out, and so does a roll that reaches 1,000,000x.

import { ints, scale, trimmed } from "../stream.js";
import { oneOf, need } from "../params.js";

export const id = "snakes";
export const name = "Alley Run";
export const rulesVersion = "s1";
export const stepped = true;

const TILES = 12;
const ROLLS = 10;
const TOP = 10000000000; // 1,000,000x in ten-thousandths

/** Tile weights, tile 0 first. @type {Record<string, number[]>} */
export const BOARDS = {
  easy: [10, 12, 15, 11, 0, 13, 20, 11, 12, 15, 11, 30],
  medium: [10, 13, 0, 15, 12, 20, 0, 14, 12, 25, 13, 40],
  hard: [10, 0, 18, 15, 0, 25, 14, 0, 20, 16, 30, 60],
  expert: [10, 0, 25, 0, 20, 40, 0, 22, 0, 30, 25, 100],
  master: [10, 0, 40, 0, 30, 0, 60, 0, 35, 0, 50, 200],
};

/** @param {any} p */
export function parseParams(p) {
  return { difficulty: oneOf(p?.difficulty, Object.keys(BOARDS), "difficulty") };
}

/** S(p): summed weight the 36 dice pairs land on from tile p. @param {string} difficulty @param {number} p */
export function reach(difficulty, p) {
  let sum = 0;
  for (let s = 2; s <= 12; s++) sum += (6 - Math.abs(s - 7)) * BOARDS[difficulty][(p + s) % TILES];
  return sum;
}

/** @param {string} difficulty @param {[number, number][]} moves [from, to] pairs */
export function stepMultiplier(difficulty, moves) {
  need(moves.length > 0, "at least one move");
  const w = BOARDS[difficulty];
  const num = moves.reduce((a, [, t]) => a * 36n * BigInt(w[t]), 1n);
  const den = moves.reduce((a, [p]) => a * BigInt(reach(difficulty, p)), 1n);
  return trimmed(num, den);
}

/**
 * Where the dice take the piece on a board, roll by roll, until the walk
 * ends: "lost" on a snake, "cashout" on the 10th roll or at 1,000,000x.
 * `multipliers` holds the multiplier after each safe roll.
 * @param {string} difficulty @param {number[]} dice
 */
export function walk(difficulty, dice) {
  const path = [0];
  /** @type {number[]} */
  const multipliers = [];
  for (let k = 0; k < ROLLS; k++) {
    const to = (path[path.length - 1] + dice[2 * k] + dice[2 * k + 1]) % TILES;
    path.push(to);
    if (BOARDS[difficulty][to] === 0) return { end: "lost", path, multipliers };
    /** @type {[number, number][]} */
    const moves = path.slice(1).map((t, i) => [path[i], t]);
    const m = stepMultiplier(difficulty, moves);
    multipliers.push(m);
    if (k + 1 === ROLLS || m >= TOP) return { end: "cashout", path, multipliers };
  }
  throw new Error("unreachable");
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  parseParams(params);
  const dice = (await ints(s, c, nonce, 2 * ROLLS)).map((n) => scale(n, 6) + 1);
  return { outcome: { dice, path: [0] }, multiplier: 0 };
}
