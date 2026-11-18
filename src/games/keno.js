// @ts-check
// Keno: 10 numbers drawn without replacement from 1..40. Step i takes
// position floor(n_i * (40 - i) / 2^32) of the numbers left. Pays the table
// for the risk, the number of picks and the number of hits.

import { drawWithoutReplacement, ints, range } from "../stream.js";
import { need, oneOf } from "../params.js";
import { TABLES } from "../tables/keno.js";

export const id = "keno";
export const name = "Keno";
export const rulesVersion = "k1";

/** @param {any} p */
export function parseParams(p) {
  const risk = oneOf(p?.risk, Object.keys(TABLES), "risk");
  const picks = p?.picks;
  need(Array.isArray(picks) && picks.length >= 1 && picks.length <= 10, "picks must be 1 to 10 numbers");
  need(picks.every((x) => Number.isInteger(x) && x >= 1 && x <= 40), "picks must be numbers from 1 to 40");
  need(new Set(picks).size === picks.length, "picks must not repeat");
  return { picks: [...picks].sort((a, b) => a - b), risk };
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { picks, risk } = parseParams(params);
  const drawn = drawWithoutReplacement(await ints(s, c, nonce, 10), range(1, 40));
  const hits = picks.filter((x) => drawn.includes(x)).length;
  return { outcome: { drawn, hits }, multiplier: TABLES[risk][picks.length - 1][hits] * 100 };
}
