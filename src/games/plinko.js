// @ts-check
// Plinko: row i sends the ball right when floor(n_i * 2 / 2^32) = 1; the slot
// is the number of rights. Plinko has its own seed pair, apart from the other
// games. Pays the table's multiplier for the slot.

import { ints, scale } from "../stream.js";
import { int, oneOf } from "../params.js";
import { RISKS, table, version } from "../tables/plinko.js";

export const id = "plinko";
export const name = "Plinko";
export const rulesVersion = version;

/** @param {any} p */
export function parseParams(p) {
  return { rows: int(p?.rows, 8, 16, "rows"), risk: oneOf(p?.risk, RISKS, "risk") };
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { rows, risk } = parseParams(params);
  const path = (await ints(s, c, nonce, rows)).map((n) => scale(n, 2));
  const slot = path.reduce((a, b) => a + b, 0);
  return { outcome: { path, slot, table_version: version }, multiplier: table(rows, risk)[slot] * 100 };
}
