// @ts-check
// Darts: ticket = floor(n0 * 100,000 / 2^32), walked through the board's
// zones from the outside in (lowest multiplier first) by weight.

import { ints, scale, ticketRow } from "../stream.js";
import { oneOf } from "../params.js";
import { TABLES } from "../tables/darts.js";

export const id = "darts";
export const name = "Darts";
export const rulesVersion = "t1";

/** @param {any} p */
export function parseParams(p) {
  return { risk: oneOf(p?.risk, Object.keys(TABLES), "risk") };
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { risk } = parseParams(params);
  const [n] = await ints(s, c, nonce, 1);
  const ticket = scale(n, 100000);
  const zone = ticketRow(TABLES[risk].map(([, w]) => w), ticket);
  return { outcome: { ticket, zone }, multiplier: TABLES[risk][zone][0] * 100 };
}
