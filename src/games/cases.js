// @ts-check
// Cases: ticket = floor(n0 * 100,000 / 2^32), walked through the risk's
// prize table in table order (lowest prize first) by weight.

import { ints, scale, ticketRow } from "../stream.js";
import { oneOf } from "../params.js";
import { TABLES } from "../tables/cases.js";

export const id = "cases";
export const name = "Cases";
export const rulesVersion = "c1";

/** @param {any} p */
export function parseParams(p) {
  return { risk: oneOf(p?.risk, Object.keys(TABLES), "risk") };
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { risk } = parseParams(params);
  const [n] = await ints(s, c, nonce, 1);
  const ticket = scale(n, 100000);
  const prize = ticketRow(TABLES[risk].map(([, w]) => w), ticket);
  return { outcome: { ticket, prize }, multiplier: TABLES[risk][prize][0] * 100 };
}
