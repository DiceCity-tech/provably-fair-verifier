// @ts-check
// Limbo: result = floor(99 * 2^32 / (n0 + 1)) in hundredths, shown between
// 1.00x and 1,000,000.00x. The bet wins when the result is at least the
// target, and then pays exactly the target.

import { ints } from "../stream.js";
import { int } from "../params.js";

export const id = "limbo";
export const name = "Limbo";
export const rulesVersion = "l1";

/** @param {any} p */
export function parseParams(p) {
  return { target: int(p?.target, 101, 100000000, "target (hundredths)") };
}

/** @param {string} s @param {string} c @param {number|bigint} nonce @param {any} params */
export async function outcome(s, c, nonce, params) {
  const { target } = parseParams(params);
  const [n] = await ints(s, c, nonce, 1);
  const raw = Number((99n * 4294967296n) / BigInt(n + 1));
  const result = Math.min(Math.max(raw, 100), 100000000);
  const win = result >= target;
  return { outcome: { result, win }, multiplier: win ? target * 100 : 0 };
}
