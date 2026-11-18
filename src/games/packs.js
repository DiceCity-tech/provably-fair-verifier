// @ts-check
// Crates: 5 cards. Card i's ticket is floor(n_i * 10,000,000 / 2^32),
// walked through the card table highest multiplier first by weight. Cards
// are independent. The bet pays the sum of the five card multipliers,
// trimmed by one part in ten million and rounded down.

import { ints, scale, ticketRow, toNumber } from "../stream.js";
import { need } from "../params.js";
import { TABLE } from "../tables/packs.js";

export const id = "packs";
export const name = "Crates";
export const rulesVersion = "p1";

/** @param {any} p */
export function parseParams(p) {
  need(p == null || Object.keys(p).length === 0, "Crates takes no options");
  return {};
}

const WEIGHTS = TABLE.map(([, , w]) => w);

/**
 * The card a ticket (0 .. 9,999,999) draws.
 * @param {number} ticket
 */
export function card(ticket) {
  const row = ticketRow(WEIGHTS, ticket);
  return { ticket, row, rarity: TABLE[row][0], multiplier: TABLE[row][1] };
}

/**
 * The bet's multiplier for a sum of card multipliers: trimmed by one part
 * in ten million, rounded down (ten-thousandths).
 * @param {number} sum
 */
export const multiplierFor = (sum) => toNumber((BigInt(sum) * 9999999n) / 10000000n);

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  parseParams(params);
  const cards = (await ints(s, c, nonce, 5)).map((n) => card(scale(n, 10000000)));
  const sum = cards.reduce((a, x) => a + x.multiplier, 0);
  return { outcome: { cards, sum }, multiplier: multiplierFor(sum) };
}
