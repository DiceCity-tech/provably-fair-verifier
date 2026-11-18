// @ts-check
// Vault: 30 bars. Bar j's ticket is floor(n_j * 100,000 / 2^32), walked
// through the difficulty's table lowest multiplier first by weight. The
// player picks 1 to 5 bars (0..29); the bet pays the average of the picked
// bars' multipliers, floor(sum / picks) in ten-thousandths.

import { ints, scale, ticketRow } from "../stream.js";
import { need, oneOf } from "../params.js";
import { TABLES } from "../tables/bars.js";

export const id = "bars";
export const name = "Vault";
export const rulesVersion = "b1";

/** @param {any} p */
export function parseParams(p) {
  const difficulty = oneOf(p?.difficulty, Object.keys(TABLES), "difficulty");
  const picks = p?.picks;
  need(Array.isArray(picks) && picks.length >= 1 && picks.length <= 5, "picks must be 1 to 5 bars");
  need(picks.every((x) => Number.isInteger(x) && x >= 0 && x <= 29) && new Set(picks).size === picks.length, "picks must be distinct bars 0 to 29");
  return { difficulty, picks: [...picks].sort((a, b) => a - b) };
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { difficulty, picks } = parseParams(params);
  const table = TABLES[difficulty];
  const weights = table.map(([, w]) => w);
  const tickets = (await ints(s, c, nonce, 30)).map((n) => scale(n, 100000));
  const multipliers = tickets.map((t) => table[ticketRow(weights, t)][0]);
  const sum = picks.reduce((a, j) => a + multipliers[j], 0);
  return { outcome: { tickets, multipliers, sum }, multiplier: Math.floor(sum / picks.length) };
}
