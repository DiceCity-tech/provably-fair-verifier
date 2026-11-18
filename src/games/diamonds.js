// @ts-check
// Diamonds: five gems, colour floor(n * 7 / 2^32) each (0..6). Pays by how
// the colours group: five of a kind 50x, four of a kind 5.5x, full house 4x,
// three of a kind 3x, two pair 2x, pair 0.1x, nothing 0x.

import { ints, scale } from "../stream.js";
import { need } from "../params.js";

export const id = "diamonds";
export const name = "Diamonds";
export const rulesVersion = "d1";

/** Group sizes, largest first, to hand name and multiplier in ten-thousandths. @type {Record<string, [string, number]>} */
const HANDS = {
  "5": ["five_of_a_kind", 500000],
  "4,1": ["four_of_a_kind", 55000],
  "3,2": ["full_house", 40000],
  "3,1,1": ["three_of_a_kind", 30000],
  "2,2,1": ["two_pair", 20000],
  "2,1,1,1": ["pair", 1000],
  "1,1,1,1,1": ["nothing", 0],
};

/** @param {any} p */
export function parseParams(p) {
  need(p == null || Object.keys(p).length === 0, "Diamonds takes no options");
  return {};
}

/**
 * The hand five gems make, and what it pays in ten-thousandths.
 * @param {number[]} gems
 */
export function hand(gems) {
  /** @type {Record<number, number>} */
  const freq = {};
  for (const g of gems) freq[g] = (freq[g] ?? 0) + 1;
  const [name, multiplier] = HANDS[Object.values(freq).sort((a, b) => b - a).join(",")];
  return { hand: name, multiplier };
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  parseParams(params);
  const gems = (await ints(s, c, nonce, 5)).map((n) => scale(n, 7));
  const { hand: name, multiplier } = hand(gems);
  return { outcome: { gems, hand: name }, multiplier };
}
